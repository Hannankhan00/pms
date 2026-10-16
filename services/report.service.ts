import { prisma } from "../lib/db/prisma";
import { tenantDb } from "../lib/tenant/tenant-db";
import { Prisma, ShiftStatus } from "@prisma/client";
import { parseDateRange } from "../lib/utils/date-helpers";

export interface SalesTimelineItem {
  date: string;
  dailyRevenue: number;
  dailyDiscount: number;
  transactionCount: number;
}

export interface InventoryValuationSummary {
  totalCapitalLocked: number;
  totalRetailValue: number;
  potentialProfit: number;
  totalActiveBatches: number;
  totalUnitsInStock: number;
}

export interface ExpiringBatchItem {
  id: string;
  batchNumber: string;
  medicineName: string;
  sku: string;
  expiryDate: Date;
  daysRemaining: number;
  currentStock: number;
  purchasePrice: number;
  atRiskCapital: number;
  isExpired: boolean;
}

export class ReportService {
  private readonly tenantId: string;
  private readonly db;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  /**
   * Component 1: Financial & Sales Timeline
   * Uses Prisma.$queryRaw with parameterized inputs to group sales per calendar day.
   */
  async getSalesTimeline(params: {
    startDate?: string;
    endDate?: string;
    timezoneOffset?: number;
    branchId?: string;
  }): Promise<{ summary: { totalRevenue: number; totalDiscount: number; transactionCount: number }; timeline: SalesTimelineItem[] }> {
    const { start, end } = parseDateRange({
      startDate: params.startDate,
      endDate: params.endDate,
      timezoneOffset: params.timezoneOffset,
    });

    const timelineRaw = await prisma.$queryRaw<
      Array<{
        date: string;
        dailyRevenue: number | Prisma.Decimal;
        dailyDiscount: number | Prisma.Decimal;
        transactionCount: bigint | number;
      }>
    >`
      SELECT 
        DATE_FORMAT(saleDate, '%Y-%m-%d') as date,
        COALESCE(SUM(totalAmount), 0) as dailyRevenue,
        COALESCE(SUM(discount), 0) as dailyDiscount,
        COUNT(id) as transactionCount
      FROM sales
      WHERE tenantId = ${this.tenantId}
        AND isDeleted = 0
        AND status = 'COMPLETED'
        AND saleDate >= ${start}
        AND saleDate <= ${end}
        ${params.branchId ? Prisma.sql`AND branchId = ${params.branchId}` : Prisma.empty}
      GROUP BY DATE_FORMAT(saleDate, '%Y-%m-%d')
      ORDER BY date ASC
    `;

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTransactions = 0;

    const timeline: SalesTimelineItem[] = timelineRaw.map((row) => {
      const revenue = Number(row.dailyRevenue);
      const discount = Number(row.dailyDiscount);
      const count = Number(row.transactionCount);

      totalRevenue += revenue;
      totalDiscount += discount;
      totalTransactions += count;

      return {
        date: row.date,
        dailyRevenue: revenue,
        dailyDiscount: discount,
        transactionCount: count,
      };
    });

    return {
      summary: {
        totalRevenue,
        totalDiscount,
        transactionCount: totalTransactions,
      },
      timeline,
    };
  }

  /**
   * Component 2: Inventory Valuation
   * Multiplies stock * purchasePrice across all non-expired batches using Prisma.$queryRaw.
   */
  async getInventoryValuation(params?: {
    branchId?: string;
    categoryId?: string;
  }): Promise<{ summary: InventoryValuationSummary; topBatches: any[] }> {
    const today = new Date();

    const batchesRaw = await prisma.$queryRaw<
      Array<{
        batchId: string;
        batchNumber: string;
        expiryDate: Date;
        purchasePrice: number | Prisma.Decimal;
        sellingPrice: number | Prisma.Decimal;
        medicineName: string;
        sku: string;
        categoryName: string | null;
        currentStock: bigint | number;
      }>
    >`
      SELECT 
        b.id as batchId,
        b.batchNumber,
        b.expiryDate,
        b.purchasePrice,
        b.sellingPrice,
        m.name as medicineName,
        m.sku,
        c.name as categoryName,
        COALESCE(SUM(il.quantity), 0) as currentStock
      FROM medicine_batches b
      JOIN medicines m ON m.id = b.medicineId
      LEFT JOIN categories c ON c.id = m.categoryId
      LEFT JOIN inventory_ledgers il ON il.batchId = b.id AND il.tenantId = ${this.tenantId}
      WHERE b.tenantId = ${this.tenantId}
        AND b.isDeleted = 0
        AND b.expiryDate > ${today}
        ${params?.categoryId ? Prisma.sql`AND m.categoryId = ${params.categoryId}` : Prisma.empty}
      GROUP BY b.id, b.batchNumber, b.expiryDate, b.purchasePrice, b.sellingPrice, m.name, m.sku, c.name
      HAVING currentStock > 0
      ORDER BY currentStock DESC
    `;

    let totalCapitalLocked = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;

    const topBatches = batchesRaw.map((b) => {
      const stock = Number(b.currentStock);
      const cost = stock * Number(b.purchasePrice);
      const retail = stock * Number(b.sellingPrice);

      totalCapitalLocked += cost;
      totalRetailValue += retail;
      totalUnits += stock;

      return {
        batchId: b.batchId,
        batchNumber: b.batchNumber,
        medicineName: b.medicineName,
        sku: b.sku,
        categoryName: b.categoryName || "General",
        currentStock: stock,
        purchasePrice: Number(b.purchasePrice),
        sellingPrice: Number(b.sellingPrice),
        capitalLocked: cost,
        expiryDate: b.expiryDate,
      };
    });

    return {
      summary: {
        totalCapitalLocked,
        totalRetailValue,
        potentialProfit: totalRetailValue - totalCapitalLocked,
        totalActiveBatches: batchesRaw.length,
        totalUnitsInStock: totalUnits,
      },
      topBatches: topBatches.sort((a, b) => b.capitalLocked - a.capitalLocked).slice(0, 10),
    };
  }

  /**
   * Component 2: Expiring Inventory (ORM query)
   * Fetches batches expiring between today and today + 90 days.
   */
  async getExpiringInventory(params?: {
    days?: number;
    branchId?: string;
  }): Promise<{ summary: { expiringCount: number; totalAtRiskCapital: number }; batches: ExpiringBatchItem[] }> {
    const days = params?.days ?? 90;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threshold = new Date(today.getTime() + days * 86400000);
    threshold.setHours(23, 59, 59, 999);

    const batches = await this.db.medicineBatch.findMany({
      where: {
        tenantId: this.tenantId,
        isDeleted: false,
        expiryDate: {
          lte: threshold,
        },
      },
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        ledgers: {
          where: {
            tenantId: this.tenantId,
            ...(params?.branchId ? { branchId: params.branchId } : {}),
          },
          select: {
            quantity: true,
          },
        },
      },
      orderBy: {
        expiryDate: "asc",
      },
    });

    const result: ExpiringBatchItem[] = [];
    let totalAtRiskCapital = 0;

    for (const b of batches) {
      const stock = (b.ledgers || []).reduce((acc: number, curr: { quantity: number }) => acc + curr.quantity, 0);
      if (stock <= 0) continue;

      const pPrice = Number(b.purchasePrice);
      const atRisk = stock * pPrice;
      const isPast = new Date(b.expiryDate).getTime() < today.getTime();
      const diffMs = new Date(b.expiryDate).getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      totalAtRiskCapital += atRisk;

      result.push({
        id: b.id,
        batchNumber: b.batchNumber,
        medicineName: b.medicine.name,
        sku: b.medicine.sku,
        expiryDate: b.expiryDate,
        daysRemaining,
        currentStock: stock,
        purchasePrice: pPrice,
        atRiskCapital: atRisk,
        isExpired: isPast,
      });
    }

    return {
      summary: {
        expiringCount: result.length,
        totalAtRiskCapital,
      },
      batches: result,
    };
  }

  /**
   * Component 3: Shift & Cashier Reconciliation (EOD)
   * Aggregates closed shifts and computes cash discrepancies.
   */
  async getShiftReconciliation(params: {
    startDate?: string;
    endDate?: string;
    cashierId?: string;
    branchId?: string;
  }) {
    const { start, end } = parseDateRange({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const shifts = await this.db.shift.findMany({
      where: {
        tenantId: this.tenantId,
        status: ShiftStatus.CLOSED,
        ...(params.cashierId ? { userId: params.cashierId } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        openedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        transactions: true,
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    let totalExpected = 0;
    let totalClosing = 0;
    let totalVariance = 0;
    let shortageCount = 0;

    const shiftList = (shifts as any[]).map((s: any) => {
      const expected = Number(s.expectedCash || 0);
      const closing = Number(s.closingCash || 0);
      const variance = closing - expected;

      totalExpected += expected;
      totalClosing += closing;
      totalVariance += variance;

      if (variance < -0.01) shortageCount += 1;

      const drops = (s.transactions || [])
        .filter((t: any) => t.type === "CASH_DROP")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const payouts = (s.transactions || [])
        .filter((t: any) => t.type === "PAYOUT")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      return {
        id: s.id,
        shiftNumber: `SH-${s.id.slice(-6).toUpperCase()}`,
        cashierName: s.user.name,
        branchName: s.branch?.name || "Main Branch",
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingFloat: Number(s.openingCash),
        expectedCash: expected,
        closingCash: closing,
        variance,
        isShortage: variance < -0.01,
        totalDrops: drops,
        totalPayouts: payouts,
        transactions: s.transactions,
      };
    });

    return {
      summary: {
        shiftCount: shifts.length,
        totalExpectedCash: totalExpected,
        totalClosingCash: totalClosing,
        totalVariance,
        shortageCount,
      },
      shifts: shiftList,
    };
  }

  /**
   * Component 4: Clinical Analytics
   * Leaderboard of prescribing physicians and percentage of sales with Rx items.
   */
  async getClinicalAnalytics(params: {
    startDate?: string;
    endDate?: string;
    timezoneOffset?: number;
    branchId?: string;
  }) {
    const { start, end } = parseDateRange({
      startDate: params.startDate,
      endDate: params.endDate,
      timezoneOffset: params.timezoneOffset,
    });

    // 1. Top Prescribing Doctors
    const topDoctorsRaw = await prisma.$queryRaw<
      Array<{
        doctorId: string;
        doctorName: string;
        specialization: string | null;
        hospitalAffiliation: string | null;
        licenseNumber: string | null;
        prescriptionCount: bigint | number;
        dispensedCount: bigint | number;
      }>
    >`
      SELECT 
        d.id as doctorId,
        d.name as doctorName,
        d.specialization,
        d.hospitalAffiliation,
        d.licenseNumber,
        COUNT(p.id) as prescriptionCount,
        COUNT(CASE WHEN p.status = 'DISPENSED' THEN 1 END) as dispensedCount
      FROM doctors d
      JOIN prescriptions p ON p.doctorId = d.id
      WHERE p.tenantId = ${this.tenantId}
        AND p.isDeleted = 0
        AND p.prescriptionDate >= ${start}
        AND p.prescriptionDate <= ${end}
      GROUP BY d.id, d.name, d.specialization, d.hospitalAffiliation, d.licenseNumber
      ORDER BY prescriptionCount DESC
      LIMIT 10
    `;

    // 2. Percentage of sales containing at least one Rx-required medication
    const totalCompletedSales = await this.db.sale.count({
      where: {
        tenantId: this.tenantId,
        status: "COMPLETED",
        isDeleted: false,
        saleDate: { gte: start, lte: end },
        ...(params.branchId ? { branchId: params.branchId } : {}),
      },
    });

    const rxSalesCountRaw = await prisma.$queryRaw<Array<{ rxSalesCount: bigint | number }>>`
      SELECT COUNT(DISTINCT s.id) as rxSalesCount
      FROM sales s
      JOIN sale_items si ON si.saleId = s.id
      JOIN medicines m ON m.id = si.medicineId
      WHERE s.tenantId = ${this.tenantId}
        AND s.isDeleted = 0
        AND s.status = 'COMPLETED'
        AND m.isPrescriptionRequired = 1
        AND s.saleDate >= ${start}
        AND s.saleDate <= ${end}
        ${params.branchId ? Prisma.sql`AND s.branchId = ${params.branchId}` : Prisma.empty}
    `;

    const rxSalesCount = Number(rxSalesCountRaw[0]?.rxSalesCount || 0);
    const rxSalesPercentage = totalCompletedSales > 0 ? (rxSalesCount / totalCompletedSales) * 100 : 0;

    return {
      summary: {
        totalCompletedSales,
        rxSalesCount,
        rxSalesPercentage: Number(rxSalesPercentage.toFixed(1)),
      },
      topDoctors: topDoctorsRaw.map((d) => ({
        doctorId: d.doctorId,
        doctorName: d.doctorName,
        specialization: d.specialization || "General Physician",
        hospitalAffiliation: d.hospitalAffiliation || "Independent Clinic",
        licenseNumber: d.licenseNumber || "N/A",
        prescriptionCount: Number(d.prescriptionCount),
        dispensedCount: Number(d.dispensedCount),
      })),
    };
  }
}
