import { ReportsRepository } from "../repositories/reports.repository";
import { parseDateRange } from "../lib/utils/date-helpers";
import {
  SalesReportQueryInput,
  InventoryValuationQueryInput,
  InventoryExpiryQueryInput,
  InventoryMovementQueryInput,
  ShiftReportQueryInput,
  ClinicalReportQueryInput,
} from "../validations/reports.schema";

export class ReportsService {
  private readonly reportsRepo: ReportsRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.reportsRepo = new ReportsRepository(tenantId);
  }

  // 1. Sales & Revenue Analytics
  async getSalesReport(query: SalesReportQueryInput) {
    const { start, end } = parseDateRange({
      startDate: query.startDate,
      endDate: query.endDate,
      timezoneOffset: query.timezoneOffset,
    });

    return this.reportsRepo.getSalesReport({
      start,
      end,
      branchId: query.branchId,
      paymentMethod: query.paymentMethod,
    });
  }

  // 2. Inventory Valuation
  async getInventoryValuation(query: InventoryValuationQueryInput) {
    return this.reportsRepo.getInventoryValuation({
      branchId: query.branchId,
      categoryId: query.categoryId,
    });
  }

  // 2. Inventory Expiry
  async getInventoryExpiry(query: InventoryExpiryQueryInput) {
    return this.reportsRepo.getInventoryExpiry({
      days: query.days,
      branchId: query.branchId,
    });
  }

  // 2. Inventory Movement
  async getInventoryMovement(query: InventoryMovementQueryInput) {
    return this.reportsRepo.getInventoryMovement({
      fastMovingDays: query.fastMovingDays,
      deadStockDays: query.deadStockDays,
      limit: query.limit,
      branchId: query.branchId,
    });
  }

  // 3. Shift & Cashier Reconciliation (EOD)
  async getShiftReconciliation(query: ShiftReportQueryInput) {
    const { start, end } = parseDateRange({
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return this.reportsRepo.getShiftReconciliation({
      start,
      end,
      cashierId: query.cashierId,
      branchId: query.branchId,
      shiftId: query.shiftId,
    });
  }

  // 4. Clinical & Dispensing Analytics
  async getClinicalAnalytics(query: ClinicalReportQueryInput) {
    const { start, end } = parseDateRange({
      startDate: query.startDate,
      endDate: query.endDate,
      timezoneOffset: query.timezoneOffset,
    });

    return this.reportsRepo.getClinicalAnalytics({
      start,
      end,
      branchId: query.branchId,
      doctorId: query.doctorId,
    });
  }
}
