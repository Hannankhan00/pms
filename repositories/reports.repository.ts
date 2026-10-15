import { tenantDb } from "../lib/tenant/tenant-db";
import { prisma } from "../lib/db/prisma";
import { Prisma, SaleStatus, ShiftStatus } from "@prisma/client";

export class ReportsRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // ============================================================================
  // 1. FINANCIAL & SALES ANALYTICS
  // ============================================================================

  async getSalesReport(params: {
    start: Date;
    end: Date;
    branchId?: string;
    paymentMethod?: string;
  }) {
    const saleWhere: Prisma.SaleWhereInput = {
      tenantId: this.tenantId,
      isDeleted: false,
      status: SaleStatus.COMPLETED,
      saleDate: {
        gte: params.start,
        lte: params.end,
      },
    };

    if (params.branchId) {
      saleWhere.branchId = params.branchId;
    }

    if (params.paymentMethod && params.paymentMethod !== "ALL") {
      saleWhere.payments = {
        some: {
          method: params.paymentMethod as any,
        },
      };
    }

    // Core Aggregates
    const aggregates = await this.db.sale.aggregate({
      where: saleWhere,
      _sum: {
        totalAmount: true,
        discount: true,
        tax: true,
        subtotal: true,
      },
      _count: {
        id: true,
      },
    });

    // Breakdown by Payment Method
    const paymentBreakdown = await this.db.payment.groupBy({
      by: ["method"],
      where: {
        tenantId: this.tenantId,
        type: "CUSTOMER_RECEIPT",
        date: {
          gte: params.start,
          lte: params.end,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // Daily Sales Timeline (Raw parameterized query for optimal MySQL grouping)
    const dailyRaw = await prisma.$queryRaw<
      Array<{ date: string; revenue: any; salesCount: bigint | number }>
    >`
      SELECT 
        DATE_FORMAT(saleDate, '%Y-%m-%d') as date,
        COALESCE(SUM(totalAmount), 0) as revenue,
        COUNT(id) as salesCount
      FROM sales
      WHERE tenantId = ${this.tenantId}
        AND isDeleted = 0
        AND status = 'COMPLETED'
        AND saleDate >= ${params.start}
        AND saleDate <= ${params.end}
        ${params.branchId ? Prisma.sql`AND branchId = ${params.branchId}` : Prisma.empty}
      GROUP BY DATE_FORMAT(saleDate, '%Y-%m-%d')
      ORDER BY date ASC
    `;

    const totalRevenue = Number(aggregates._sum.totalAmount || 0);
    const totalDiscount = Number(aggregates._sum.discount || 0);
    const totalTax = Number(aggregates._sum.tax || 0);
    const totalSubtotal = Number(aggregates._sum.subtotal || 0);
    const salesCount = aggregates._count.id || 0;
    const averageBasket = salesCount > 0 ? totalRevenue / salesCount : 0;

    return {
      summary: {
        totalRevenue,
        totalDiscount,
        totalTax,
        totalSubtotal,
        salesCount,
        averageBasket,
      },
      byPaymentMethod: (paymentBreakdown as any[]).map((item: any) => ({
        method: item.method,
        totalAmount: Number(item._sum.amount || 0),
        count: item._count.id,
        percentage: totalRevenue > 0 ? (Number(item._sum.amount || 0) / totalRevenue) * 100 : 0,
      })),
      timeline: dailyRaw.map((day) => {
        const count = Number(day.salesCount);
        const rev = Number(day.revenue);
        return {
          date: day.date,
          revenue: rev,
          salesCount: count,
          averageBasket: count > 0 ? rev / count : 0,
        };
      }),
    };
  }

  // ============================================================================
  // 2. INVENTORY INTELLIGENCE: VALUATION
  // ============================================================================

  async getInventoryValuation(params: { branchId?: string; categoryId?: string }) {
    const batchesRaw = await prisma.$queryRaw<
      Array<{
        batchId: string;
        batchNumber: string;
        expiryDate: Date;
        purchasePrice: any;
        sellingPrice: any;
        medicineId: string;
        medicineName: string;
        sku: string;
        categoryId: string | null;
        categoryName: string | null;
        currentStock: any;
      }>
    >`
      SELECT 
        b.id as batchId,
        b.batchNumber,
        b.expiryDate,
        b.purchasePrice,
        b.sellingPrice,
        b.medicineId,
        m.name as medicineName,
        m.sku,
        c.id as categoryId,
        c.name as categoryName,
        COALESCE(SUM(il.quantity), 0) as currentStock
      FROM medicine_batches b
      JOIN medicines m ON m.id = b.medicineId
      LEFT JOIN categories c ON c.id = m.categoryId
      LEFT JOIN inventory_ledgers il ON il.batchId = b.id AND il.tenantId = ${this.tenantId}
      WHERE b.tenantId = ${this.tenantId}
        AND b.isDeleted = 0
        ${params.categoryId ? Prisma.sql`AND m.categoryId = ${params.categoryId}` : Prisma.empty}
      GROUP BY b.id, b.batchNumber, b.expiryDate, b.purchasePrice, b.sellingPrice, b.medicineId, m.name, m.sku, c.id, c.name
      HAVING currentStock > 0
      ORDER BY currentStock DESC
    `;

    let totalValuation = 0;
    let totalRetailValue = 0;
    let totalUnits = 0;
    const categoryMap = new Map<string, { name: string; units: number; valuation: number; batchCount: number }>();

    const batchDetails = batchesRaw.map((batch) => {
      const stock = Number(batch.currentStock);
      const purchasePrice = Number(batch.purchasePrice);
      const sellingPrice = Number(batch.sellingPrice);
      const batchCost = stock * purchasePrice;
      const batchRetail = stock * sellingPrice;

      totalValuation += batchCost;
      totalRetailValue += batchRetail;
      totalUnits += stock;

      const catName = batch.categoryName || "Uncategorized";
      const catId = batch.categoryId || "uncategorized";
      const existing = categoryMap.get(catId) || { name: catName, units: 0, valuation: 0, batchCount: 0 };
      existing.units += stock;
      existing.valuation += batchCost;
      existing.batchCount += 1;
      categoryMap.set(catId, existing);

      return {
        batchId: batch.batchId,
        batchNumber: batch.batchNumber,
        medicineName: batch.medicineName,
        sku: batch.sku,
        categoryName: catName,
        currentStock: stock,
        purchasePrice,
        sellingPrice,
        valuation: batchCost,
        potentialProfit: batchRetail - batchCost,
        expiryDate: batch.expiryDate,
      };
    });

    // Top 10 Capital-Tied Batches
    const topValuedBatches = [...batchDetails]
      .sort((a, b) => b.valuation - a.valuation)
      .slice(0, 10);

    const categoryBreakdown = Array.from(categoryMap.values()).map((c) => ({
      ...c,
      percentage: totalValuation > 0 ? (c.valuation / totalValuation) * 100 : 0,
    }));

    return {
      summary: {
        totalValuation,
        totalRetailValue,
        potentialGrossProfit: totalRetailValue - totalValuation,
        totalUnitsInStock: totalUnits,
        totalActiveBatches: batchesRaw.length,
      },
      topValuedBatches,
      categoryBreakdown,
    };
  }

  // ============================================================================
  // 2. INVENTORY INTELLIGENCE: EXPIRY SURVEILLANCE
  // ============================================================================

  async getInventoryExpiry(params: { days: number; branchId?: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date(today.getTime() + params.days * 24 * 60 * 60 * 1000);
    thresholdDate.setHours(23, 59, 59, 999);

    const batchesRaw = await prisma.$queryRaw<
      Array<{
        batchId: string;
        batchNumber: string;
        expiryDate: Date;
        purchasePrice: any;
        sellingPrice: any;
        medicineId: string;
        medicineName: string;
        sku: string;
        categoryId: string | null;
        categoryName: string | null;
        currentStock: any;
      }>
    >`
      SELECT 
        b.id as batchId,
        b.batchNumber,
        b.expiryDate,
        b.purchasePrice,
        b.sellingPrice,
        b.medicineId,
        m.name as medicineName,
        m.sku,
        c.id as categoryId,
        c.name as categoryName,
        COALESCE(SUM(il.quantity), 0) as currentStock
      FROM medicine_batches b
      JOIN medicines m ON m.id = b.medicineId
      LEFT JOIN categories c ON c.id = m.categoryId
      LEFT JOIN inventory_ledgers il ON il.batchId = b.id AND il.tenantId = ${this.tenantId}
      WHERE b.tenantId = ${this.tenantId}
        AND b.isDeleted = 0
        AND b.expiryDate <= ${thresholdDate}
      GROUP BY b.id, b.batchNumber, b.expiryDate, b.purchasePrice, b.sellingPrice, b.medicineId, m.name, m.sku, c.id, c.name
      HAVING currentStock > 0
      ORDER BY b.expiryDate ASC
    `;

    const expired: any[] = [];
    const expiringSoon: any[] = [];

    let expiredCapital = 0;
    let expiredUnits = 0;
    let expiringSoonCapital = 0;
    let expiringSoonUnits = 0;

    for (const b of batchesRaw) {
      const stock = Number(b.currentStock);
      const purchasePrice = Number(b.purchasePrice);
      const capital = stock * purchasePrice;
      const isPast = new Date(b.expiryDate).getTime() < today.getTime();

      const item = {
        batchId: b.batchId,
        batchNumber: b.batchNumber,
        medicineName: b.medicineName,
        sku: b.sku,
        categoryName: b.categoryName || "Uncategorized",
        currentStock: stock,
        purchasePrice,
        atRiskCapital: capital,
        expiryDate: b.expiryDate,
        daysRemaining: Math.ceil((new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      };

      if (isPast) {
        expired.push(item);
        expiredCapital += capital;
        expiredUnits += stock;
      } else {
        expiringSoon.push(item);
        expiringSoonCapital += capital;
        expiringSoonUnits += stock;
      }
    }

    return {
      summary: {
        expiredCount: expired.length,
        expiredUnits,
        expiredCapital,
        expiringSoonCount: expiringSoon.length,
        expiringSoonUnits,
        expiringSoonCapital,
        totalAtRiskCapital: expiredCapital + expiringSoonCapital,
      },
      expired,
      expiringSoon,
    };
  }

  // ============================================================================
  // 2. INVENTORY INTELLIGENCE: MOVEMENT (Fast-Moving vs Dead Stock)
  // ============================================================================

  async getInventoryMovement(params: {
    fastMovingDays: number;
    deadStockDays: number;
    limit: number;
    branchId?: string;
  }) {
    const fastMovingStartDate = new Date(Date.now() - params.fastMovingDays * 86400000);
    const deadStockStartDate = new Date(Date.now() - params.deadStockDays * 86400000);

    // Fast-Moving: Highest units sold in last N days
    const fastMovingRaw = await prisma.$queryRaw<
      Array<{
        medicineId: string;
        medicineName: string;
        sku: string;
        categoryName: string | null;
        totalQuantitySold: any;
        totalRevenue: any;
        transactionsCount: bigint | number;
      }>
    >`
      SELECT 
        si.medicineId,
        m.name as medicineName,
        m.sku as sku,
        c.name as categoryName,
        COALESCE(SUM(si.quantity), 0) as totalQuantitySold,
        COALESCE(SUM(si.subtotal), 0) as totalRevenue,
        COUNT(DISTINCT si.saleId) as transactionsCount
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      JOIN medicines m ON m.id = si.medicineId
      LEFT JOIN categories c ON c.id = m.categoryId
      WHERE s.tenantId = ${this.tenantId}
        AND s.isDeleted = 0
        AND s.status = 'COMPLETED'
        AND s.saleDate >= ${fastMovingStartDate}
        ${params.branchId ? Prisma.sql`AND s.branchId = ${params.branchId}` : Prisma.empty}
      GROUP BY si.medicineId, m.name, m.sku, c.name
      ORDER BY totalQuantitySold DESC
      LIMIT ${params.limit}
    `;

    // Dead Stock: Has stock > 0 across ledgers, but 0 sales within deadStockDays
    const deadStockRaw = await prisma.$queryRaw<
      Array<{
        medicineId: string;
        medicineName: string;
        sku: string;
        categoryName: string | null;
        currentStock: any;
        deadStockValue: any;
        lastBatchDate: Date;
      }>
    >`
      SELECT 
        m.id as medicineId,
        m.name as medicineName,
        m.sku as sku,
        c.name as categoryName,
        COALESCE(SUM(il.quantity), 0) as currentStock,
        COALESCE(SUM(il.quantity * b.purchasePrice), 0) as deadStockValue,
        MAX(b.createdAt) as lastBatchDate
      FROM medicines m
      JOIN medicine_batches b ON b.medicineId = m.id AND b.isDeleted = 0
      JOIN inventory_ledgers il ON il.batchId = b.id AND il.tenantId = ${this.tenantId}
      LEFT JOIN categories c ON c.id = m.categoryId
      WHERE m.tenantId = ${this.tenantId}
        AND m.isDeleted = 0
        AND m.id NOT IN (
          SELECT DISTINCT si.medicineId 
          FROM sale_items si
          JOIN sales s ON s.id = si.saleId
          WHERE s.tenantId = ${this.tenantId}
            AND s.isDeleted = 0
            AND s.saleDate >= ${deadStockStartDate}
        )
      GROUP BY m.id, m.name, m.sku, c.name
      HAVING currentStock > 0
      ORDER BY deadStockValue DESC
      LIMIT ${params.limit}
    `;

    const fastMoving = fastMovingRaw.map((row) => ({
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      sku: row.sku,
      categoryName: row.categoryName || "Uncategorized",
      totalQuantitySold: Number(row.totalQuantitySold),
      totalRevenue: Number(row.totalRevenue),
      transactionsCount: Number(row.transactionsCount),
    }));

    const deadStock = deadStockRaw.map((row) => ({
      medicineId: row.medicineId,
      medicineName: row.medicineName,
      sku: row.sku,
      categoryName: row.categoryName || "Uncategorized",
      currentStock: Number(row.currentStock),
      deadStockValue: Number(row.deadStockValue),
      lastBatchDate: row.lastBatchDate,
    }));

    const totalDeadStockCapital = deadStock.reduce((acc, curr) => acc + curr.deadStockValue, 0);

    return {
      summary: {
        fastMovingCount: fastMoving.length,
        deadStockCount: deadStock.length,
        totalDeadStockCapital,
      },
      fastMoving,
      deadStock,
    };
  }

  // ============================================================================
  // 3. SHIFT & CASHIER RECONCILIATION (End-of-Day)
  // ============================================================================

  async getShiftReconciliation(params: {
    start: Date;
    end: Date;
    cashierId?: string;
    branchId?: string;
    shiftId?: string;
  }) {
    const shifts = await this.db.shift.findMany({
      where: {
        tenantId: this.tenantId,
        status: ShiftStatus.CLOSED,
        ...(params.shiftId ? { id: params.shiftId } : {}),
        ...(params.cashierId ? { userId: params.cashierId } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        openedAt: {
          gte: params.start,
          lte: params.end,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true, code: true } },
        transactions: true,
        sales: {
          select: {
            id: true,
            receiptNumber: true,
            totalAmount: true,
            saleDate: true,
            payments: {
              select: {
                method: true,
              },
            },
          },
        },
      },
      orderBy: {
        openedAt: "desc",
      },
    });

    let totalVariance = 0;
    let shortageCount = 0;
    let overageCount = 0;
    let balancedCount = 0;

    const shiftReports = (shifts as any[]).map((shift: any) => {
      const openingFloat = Number(shift.openingCash);
      const expectedCash = Number(shift.expectedCash || 0);
      const closingCash = Number(shift.closingCash || 0);
      const variance = closingCash - expectedCash;

      totalVariance += variance;
      if (variance < -0.01) {
        shortageCount += 1;
      } else if (variance > 0.01) {
        overageCount += 1;
      } else {
        balancedCount += 1;
      }

      // Cash drops / payouts breakdown
      const totalDrops = (shift.transactions || [])
        .filter((t: any) => t.type === "CASH_DROP")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalPayouts = (shift.transactions || [])
        .filter((t: any) => t.type === "PAYOUT")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const shiftNumber = `SH-${shift.id.slice(-6).toUpperCase()}`;

      return {
        id: shift.id,
        shiftNumber,
        cashier: {
          id: shift.user.id,
          name: shift.user.name,
          email: shift.user.email,
        },
        branch: {
          id: shift.branch?.id,
          name: shift.branch?.name || "Main Dispensary",
          code: shift.branch?.code || "DISP-01",
        },
        startTime: shift.openedAt,
        endTime: shift.closedAt,
        openingFloat,
        expectedCash,
        closingCash,
        variance,
        status:
          variance < -0.01 ? "SHORTAGE" : variance > 0.01 ? "OVERAGE" : "BALANCED",
        totalDrops,
        totalPayouts,
        notes: shift.notes,
        salesCount: shift.sales.length,
        totalSalesVolume: shift.sales.reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0),
        transactions: (shift.transactions || []).map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount),
          reason: t.reason,
          createdAt: t.createdAt,
        })),
        recentSales: (shift.sales || []).slice(0, 10).map((s: any) => ({
          id: s.id,
          receiptNumber: s.receiptNumber,
          amount: Number(s.totalAmount),
          method: s.payments[0]?.method || "CASH",
          date: s.saleDate,
        })),
      };
    });

    return {
      summary: {
        totalShifts: shifts.length,
        totalVariance,
        shortageCount,
        overageCount,
        balancedCount,
      },
      shifts: shiftReports,
    };
  }

  // ============================================================================
  // 4. CLINICAL & DISPENSING ANALYTICS
  // ============================================================================

  async getClinicalAnalytics(params: {
    start: Date;
    end: Date;
    branchId?: string;
    doctorId?: string;
  }) {
    const rxWhere: Prisma.PrescriptionWhereInput = {
      tenantId: this.tenantId,
      isDeleted: false,
      prescriptionDate: {
        gte: params.start,
        lte: params.end,
      },
    };

    if (params.doctorId) {
      rxWhere.doctorId = params.doctorId;
    }

    const [totalPrescriptions, dispensedPrescriptions, verifiedPrescriptions] =
      await Promise.all([
        this.db.prescription.count({ where: rxWhere }),
        this.db.prescription.count({
          where: { ...rxWhere, status: "DISPENSED" },
        }),
        this.db.prescription.count({
          where: { ...rxWhere, status: { in: ["VERIFIED", "DISPENSED"] } },
        }),
      ]);

    // Rx vs OTC Volume (Raw breakdown comparing prescription required medicines against general items)
    const rxVsOtcRaw = await prisma.$queryRaw<
      Array<{
        type: string;
        totalRevenue: any;
        totalUnits: any;
        itemCount: bigint | number;
      }>
    >`
      SELECT 
        CASE WHEN m.isPrescriptionRequired = 1 THEN 'RX' ELSE 'OTC' END as type,
        COALESCE(SUM(si.subtotal), 0) as totalRevenue,
        COALESCE(SUM(si.quantity), 0) as totalUnits,
        COUNT(si.id) as itemCount
      FROM sale_items si
      JOIN sales s ON s.id = si.saleId
      JOIN medicines m ON m.id = si.medicineId
      WHERE s.tenantId = ${this.tenantId}
        AND s.isDeleted = 0
        AND s.status = 'COMPLETED'
        AND s.saleDate >= ${params.start}
        AND s.saleDate <= ${params.end}
        ${params.branchId ? Prisma.sql`AND s.branchId = ${params.branchId}` : Prisma.empty}
      GROUP BY CASE WHEN m.isPrescriptionRequired = 1 THEN 'RX' ELSE 'OTC' END
    `;

    // Leaderboard of Prescribing Doctors
    const topDoctorsRaw = await prisma.$queryRaw<
      Array<{
        doctorId: string;
        doctorName: string;
        specialization: string | null;
        hospitalAffiliation: string | null;
        licenseNumber: string | null;
        prescriptionCount: bigint | number;
        dispensedCount: bigint | number;
        patientCount: bigint | number;
      }>
    >`
      SELECT 
        d.id as doctorId,
        d.name as doctorName,
        d.specialization,
        d.hospitalAffiliation,
        d.licenseNumber,
        COUNT(p.id) as prescriptionCount,
        COUNT(CASE WHEN p.status = 'DISPENSED' THEN 1 END) as dispensedCount,
        COUNT(DISTINCT p.patientId) as patientCount
      FROM doctors d
      JOIN prescriptions p ON p.doctorId = d.id
      WHERE p.tenantId = ${this.tenantId}
        AND p.isDeleted = 0
        AND p.prescriptionDate >= ${params.start}
        AND p.prescriptionDate <= ${params.end}
      GROUP BY d.id, d.name, d.specialization, d.hospitalAffiliation, d.licenseNumber
      ORDER BY prescriptionCount DESC
      LIMIT 10
    `;

    const rxVsOtc = {
      rx: { revenue: 0, units: 0, items: 0 },
      otc: { revenue: 0, units: 0, items: 0 },
    };

    for (const r of rxVsOtcRaw) {
      if (r.type === "RX") {
        rxVsOtc.rx.revenue = Number(r.totalRevenue);
        rxVsOtc.rx.units = Number(r.totalUnits);
        rxVsOtc.rx.items = Number(r.itemCount);
      } else {
        rxVsOtc.otc.revenue = Number(r.totalRevenue);
        rxVsOtc.otc.units = Number(r.totalUnits);
        rxVsOtc.otc.items = Number(r.itemCount);
      }
    }

    const totalVolume = rxVsOtc.rx.revenue + rxVsOtc.otc.revenue;

    const topDoctors = topDoctorsRaw.map((d) => ({
      doctorId: d.doctorId,
      doctorName: d.doctorName,
      specialization: d.specialization || "General Medicine",
      hospitalAffiliation: d.hospitalAffiliation || "Independent Clinic",
      licenseNumber: d.licenseNumber || "N/A",
      prescriptionCount: Number(d.prescriptionCount),
      dispensedCount: Number(d.dispensedCount),
      patientCount: Number(d.patientCount),
    }));

    return {
      summary: {
        totalPrescriptions,
        dispensedPrescriptions,
        verifiedPrescriptions,
        verificationRate:
          totalPrescriptions > 0 ? (verifiedPrescriptions / totalPrescriptions) * 100 : 0,
        dispensingRate:
          totalPrescriptions > 0 ? (dispensedPrescriptions / totalPrescriptions) * 100 : 0,
      },
      rxVsOtc: {
        ...rxVsOtc,
        rxPercentage: totalVolume > 0 ? (rxVsOtc.rx.revenue / totalVolume) * 100 : 0,
        otcPercentage: totalVolume > 0 ? (rxVsOtc.otc.revenue / totalVolume) * 100 : 0,
      },
      topDoctors,
    };
  }
}
