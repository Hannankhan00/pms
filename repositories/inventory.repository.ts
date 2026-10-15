import { tenantDb } from "../lib/tenant/tenant-db";
import { InventoryTransactionType, InventoryLedger, Prisma } from "@prisma/client";

export interface CreateLedgerEntryInput {
  medicineId: string;
  batchId: string;
  transactionType: InventoryTransactionType;
  quantity: number | Prisma.Decimal;
  branchId?: string;
  warehouseId?: string;
  storageLocationId?: string;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdBy?: string;
}

export class InventoryRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  async createLedgerEntry(data: CreateLedgerEntryInput): Promise<InventoryLedger> {
    return this.db.inventoryLedger.create({
      data: {
        medicineId: data.medicineId,
        batchId: data.batchId,
        transactionType: data.transactionType,
        quantity: new Prisma.Decimal(data.quantity.toString()),
        branchId: data.branchId,
        warehouseId: data.warehouseId,
        storageLocationId: data.storageLocationId,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        notes: data.notes,
        createdBy: data.createdBy,
      },
    });
  }

  async getBatchStock(batchId: string, branchId?: string): Promise<number> {
    const where: Prisma.InventoryLedgerWhereInput = {
      batchId,
      ...(branchId ? { branchId } : {}),
    };

    const aggregates = await this.db.inventoryLedger.aggregate({
      where,
      _sum: {
        quantity: true,
      },
    });

    return Number(aggregates._sum.quantity || 0);
  }

  async getMedicineStock(medicineId: string, branchId?: string): Promise<number> {
    const where: Prisma.InventoryLedgerWhereInput = {
      medicineId,
      ...(branchId ? { branchId } : {}),
    };

    const aggregates = await this.db.inventoryLedger.aggregate({
      where,
      _sum: {
        quantity: true,
      },
    });

    return Number(aggregates._sum.quantity || 0);
  }

  async findLedgerEntries(params?: {
    medicineId?: string;
    batchId?: string;
    branchId?: string;
    transactionType?: InventoryTransactionType;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.InventoryLedgerWhereInput = {
      ...(params?.medicineId ? { medicineId: params.medicineId } : {}),
      ...(params?.batchId ? { batchId: params.batchId } : {}),
      ...(params?.branchId ? { branchId: params.branchId } : {}),
      ...(params?.transactionType ? { transactionType: params.transactionType } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.inventoryLedger.findMany({
        where,
        include: {
          medicine: {
            select: { id: true, name: true, sku: true },
          },
          batch: {
            select: { id: true, batchNumber: true, expiryDate: true },
          },
          branch: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      this.db.inventoryLedger.count({ where }),
    ]);

    return { items, total };
  }

  async findAvailableBatchesForDispensing(medicineId: string, branchId?: string) {
    // Retrieve non-deleted, unexpired batches ordered by FEFO (First-Expiry-First-Out)
    const now = new Date();
    const batches = await this.db.medicineBatch.findMany({
      where: {
        medicineId,
        isDeleted: false,
        expiryDate: { gt: now },
      },
      orderBy: { expiryDate: "asc" },
      include: { medicine: true },
    });

    // Calculate current balance for each batch
    const batchesWithStock = await Promise.all(
      batches.map(async (b: any) => {
        const stock = await this.getBatchStock(b.id, branchId);
        return {
          ...b,
          availableStock: stock,
        };
      })
    );

    // Return only batches that have stock available > 0
    return batchesWithStock.filter((b: any) => b.availableStock > 0);
  }
}
