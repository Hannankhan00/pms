import { InventoryRepository, CreateLedgerEntryInput } from "../repositories/inventory.repository";
import { StockAdjustmentSchema, StockAdjustmentInput } from "../validations/inventory.schema";
import { InventoryTransactionType } from "@prisma/client";
import { ValidationError, NotFoundError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";

export class InventoryService {
  private readonly repository: InventoryRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new InventoryRepository(tenantId);
  }

  async recordStockMovement(userId: string, input: CreateLedgerEntryInput) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.INVENTORY_ADJUST);
    return this.repository.createLedgerEntry({
      ...input,
      createdBy: userId,
    });
  }

  async adjustStock(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.INVENTORY_ADJUST);

    const parsed = StockAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid stock adjustment input", parsed.error.format());
    }

    const { medicineId, batchId, branchId, warehouseId, quantity, notes } = parsed.data;

    // Check that negative adjustment doesn't exceed current stock
    if (quantity < 0) {
      const currentStock = await this.repository.getBatchStock(batchId, branchId);
      if (currentStock + quantity < 0) {
        throw new ValidationError(
          `Cannot reduce stock by ${Math.abs(quantity)}. Only ${currentStock} available in this batch.`
        );
      }
    }

    return this.repository.createLedgerEntry({
      medicineId,
      batchId,
      branchId,
      warehouseId,
      transactionType: InventoryTransactionType.ADJUSTMENT,
      quantity,
      notes,
      createdBy: userId,
    });
  }

  async getBatchBalance(batchId: string, branchId?: string) {
    return this.repository.getBatchStock(batchId, branchId);
  }

  async getMedicineStock(medicineId: string, branchId?: string) {
    return this.repository.getMedicineStock(medicineId, branchId);
  }

  async getAvailableBatchesFEFO(medicineId: string, branchId?: string) {
    return this.repository.findAvailableBatchesForDispensing(medicineId, branchId);
  }

  async listLedger(params?: {
    medicineId?: string;
    batchId?: string;
    branchId?: string;
    transactionType?: InventoryTransactionType;
    limit?: number;
    offset?: number;
  }) {
    return this.repository.findLedgerEntries(params);
  }
}
