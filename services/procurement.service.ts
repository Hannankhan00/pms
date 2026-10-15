import { ProcurementRepository } from "../repositories/procurement.repository";
import {
  CreateSupplierSchema,
  CreateSupplierInput,
  CreatePurchaseSchema,
  CreatePurchaseInput,
} from "../validations/procurement.schema";
import { InventoryTransactionType, PurchaseStatus, Prisma } from "@prisma/client";
import { ValidationError, NotFoundError, ConflictError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";
import { tenantDb } from "../lib/tenant/tenant-db";

export class ProcurementService {
  private readonly repository: ProcurementRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new ProcurementRepository(tenantId);
  }

  // --- Suppliers ---
  async createSupplier(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.PURCHASE_CREATE);
    const parsed = CreateSupplierSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid supplier input", parsed.error.format());
    }
    return this.repository.createSupplier(parsed.data);
  }

  async listSuppliers() {
    return this.repository.findSuppliers();
  }

  // --- Purchase Orders & Goods Receipt ---
  async createPurchase(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.PURCHASE_CREATE);

    const parsed = CreatePurchaseSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid purchase order input", parsed.error.format());
    }

    const {
      supplierId,
      branchId,
      warehouseId,
      invoiceNumber,
      purchaseDate,
      discountAmount,
      taxAmount,
      notes,
      items,
    } = parsed.data;

    // Verify supplier exists
    const supplier = await this.repository.findSupplierById(supplierId);
    if (!supplier) {
      throw new NotFoundError("Supplier", supplierId);
    }

    // Verify invoice number is unique for this supplier
    const existing = await this.repository.findPurchaseByInvoice(supplierId, invoiceNumber);
    if (existing) {
      throw new ConflictError(
        `Invoice '${invoiceNumber}' has already been processed for this supplier`
      );
    }

    // Calculate subtotal and total
    let itemsTotal = 0;
    for (const item of items) {
      itemsTotal += item.quantity * item.unitPrice + item.tax;
    }
    const totalAmount = itemsTotal - discountAmount + taxAmount;

    // Execute atomic transaction: Create Purchase + Upsert Batches + Inflow InventoryLedger
    const db = tenantDb(this.tenantId);

    return db.transaction(async (txDb) => {
      // 1. Create Purchase record
      const purchase = await txDb.purchase.create({
        data: {
          supplierId,
          branchId,
          warehouseId,
          invoiceNumber,
          purchaseDate,
          status: PurchaseStatus.RECEIVED,
          totalAmount: new Prisma.Decimal(totalAmount.toString()),
          taxAmount: new Prisma.Decimal(taxAmount.toString()),
          discountAmount: new Prisma.Decimal(discountAmount.toString()),
          notes,
          createdBy: userId,
        },
      });

      // 2. Process each purchase item
      for (const item of items) {
        // Find or create batch
        let batch = await txDb.medicineBatch.findFirst({
          where: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
          },
        });

        if (!batch) {
          batch = await txDb.medicineBatch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              mfgDate: item.mfgDate,
              purchasePrice: new Prisma.Decimal(item.unitPrice.toString()),
              sellingPrice: new Prisma.Decimal(item.sellingPrice.toString()),
              createdBy: userId,
            },
          });
        }

        const subtotal = item.quantity * item.unitPrice + item.tax;

        // Create PurchaseItem
        await txDb.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            medicineId: item.medicineId,
            batchId: batch.id,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice.toString()),
            tax: new Prisma.Decimal(item.tax.toString()),
            subtotal: new Prisma.Decimal(subtotal.toString()),
          },
        });

        // 3. Append stock inflow to InventoryLedger
        await txDb.inventoryLedger.create({
          data: {
            medicineId: item.medicineId,
            batchId: batch.id,
            branchId,
            warehouseId,
            transactionType: InventoryTransactionType.PURCHASE,
            quantity: new Prisma.Decimal(item.quantity.toString()),
            referenceId: purchase.id,
            referenceType: "Purchase",
            notes: `Inbound PO Invoice: ${invoiceNumber}`,
            createdBy: userId,
          },
        });
      }

      return purchase;
    });
  }

  async listPurchases(params?: {
    supplierId?: string;
    branchId?: string;
    status?: PurchaseStatus;
    limit?: number;
    offset?: number;
  }) {
    return this.repository.findPurchases(params);
  }

  async getPurchase(id: string) {
    const purchase = await this.repository.findPurchaseById(id);
    if (!purchase) {
      throw new NotFoundError("Purchase Order", id);
    }
    return purchase;
  }
}
