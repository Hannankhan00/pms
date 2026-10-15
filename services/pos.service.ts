import { SalesRepository } from "../repositories/sales.repository";
import { InventoryRepository } from "../repositories/inventory.repository";
import { CreateSaleSchema, CreateSaleInput } from "../validations/pos.schema";
import { InventoryTransactionType, SaleStatus, PrescriptionStatus, ShiftStatus, Prisma } from "@prisma/client";
import { ValidationError, NotFoundError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";
import { tenantDb } from "../lib/tenant/tenant-db";

export class PosService {
  private readonly salesRepository: SalesRepository;
  private readonly inventoryRepository: InventoryRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.salesRepository = new SalesRepository(tenantId);
    this.inventoryRepository = new InventoryRepository(tenantId);
  }

  async processSale(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.POS_ACCESS);
    await requirePermission(userId, this.tenantId, PERMISSIONS.SALES_CREATE);

    const parsed = CreateSaleSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid sale transaction input", parsed.error.format());
    }

    const {
      branchId,
      customerId,
      prescriptionId,
      items,
      payments,
      discount = 0,
      tax = 0,
      notes,
    } = parsed.data;

    // 0. Shift-Gated POS Check: Verify active OPEN shift for this user
    const db = tenantDb(this.tenantId);
    const activeShift = await db.shift.findFirst({
      where: {
        userId,
        status: ShiftStatus.OPEN,
      },
    });

    if (!activeShift) {
      throw new ValidationError(
        "Shift Required: You must open a cashier shift before processing transactions."
      );
    }

    const targetBranchId = activeShift.branchId || branchId;

    // 1. Verify stock availability for all items before executing transaction
    for (const item of items) {
      const availableStock = await this.inventoryRepository.getBatchStock(item.batchId, targetBranchId);
      if (availableStock < item.quantity) {
        throw new ValidationError(
          `Insufficient stock for batch '${item.batchId}'. Requested ${item.quantity}, but only ${availableStock} units available.`
        );
      }
    }

    // 2. Compute financial totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice - item.discount + item.tax;
    }
    const totalAmount = subtotal - discount + tax;

    // 3. Verify total payments match or exceed sale amount
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(totalPaid - totalAmount) > 0.01 && totalPaid < totalAmount) {
      throw new ValidationError(
        `Total payments (${totalPaid.toFixed(2)}) do not cover total amount (${totalAmount.toFixed(2)})`
      );
    }

    // 4. Generate unique receipt number
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return db.transaction(async (txDb) => {
      // A. Create Sale header linked to active shift
      const sale = await txDb.sale.create({
        data: {
          branchId: targetBranchId,
          shiftId: activeShift.id,
          customerId,
          userId,
          prescriptionId,
          receiptNumber,
          subtotal: new Prisma.Decimal(subtotal.toString()),
          discount: new Prisma.Decimal(discount.toString()),
          tax: new Prisma.Decimal(tax.toString()),
          totalAmount: new Prisma.Decimal(totalAmount.toString()),
          status: SaleStatus.COMPLETED,
          notes,
          createdBy: userId,
        },
      });

      // B. Process items and deduct inventory ledger
      for (const item of items) {
        const itemSubtotal = item.quantity * item.unitPrice - item.discount + item.tax;

        // Create SaleItem
        await txDb.saleItem.create({
          data: {
            saleId: sale.id,
            medicineId: item.medicineId,
            batchId: item.batchId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice.toString()),
            discount: new Prisma.Decimal(item.discount.toString()),
            tax: new Prisma.Decimal(item.tax.toString()),
            subtotal: new Prisma.Decimal(itemSubtotal.toString()),
          },
        });

        // Deduct from InventoryLedger (negative quantity)
        await txDb.inventoryLedger.create({
          data: {
            medicineId: item.medicineId,
            batchId: item.batchId,
            branchId,
            transactionType: InventoryTransactionType.SALE,
            quantity: new Prisma.Decimal((-item.quantity).toString()), // Negative for outflow
            referenceId: sale.id,
            referenceType: "Sale",
            notes: `POS Dispense Receipt: ${receiptNumber}`,
            createdBy: userId,
          },
        });
      }

      // C. Process payments
      for (const payment of payments) {
        await txDb.payment.create({
          data: {
            saleId: sale.id,
            method: payment.method,
            amount: new Prisma.Decimal(payment.amount.toString()),
            referenceNumber: payment.referenceNumber,
            createdBy: userId,
          },
        });
      }

      // D. If linked to a prescription, mark it dispensed
      if (prescriptionId) {
        await txDb.prescription.update({
          where: { id: prescriptionId },
          data: { status: PrescriptionStatus.DISPENSED },
        });
      }

      return sale;
    });
  }

  async getSale(id: string) {
    const sale = await this.salesRepository.findSaleById(id);
    if (!sale) {
      throw new NotFoundError("Sale", id);
    }
    return sale;
  }

  async listSales(params?: {
    branchId?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.salesRepository.findSales(params);
  }
}
