import { tenantDb } from "../lib/tenant/tenant-db";
import { ShiftStatus, ShiftTransactionType, Prisma } from "@prisma/client";

export class ShiftRepository {
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  async findActiveShiftByUser(userId: string) {
    const db = tenantDb(this.tenantId);
    return db.shift.findFirst({
      where: {
        userId,
        status: ShiftStatus.OPEN,
      },
      include: {
        branch: true,
        user: true,
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { sales: true },
        },
      },
    });
  }

  async findShiftById(id: string) {
    const db = tenantDb(this.tenantId);
    return db.shift.findFirst({
      where: { id },
      include: {
        branch: true,
        user: true,
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        sales: {
          include: {
            payments: true,
          },
        },
      },
    });
  }

  async createShift(data: {
    userId: string;
    branchId: string;
    openingCash: number;
    notes?: string;
  }) {
    const db = tenantDb(this.tenantId);
    return db.shift.create({
      data: {
        userId: data.userId,
        branchId: data.branchId,
        status: ShiftStatus.OPEN,
        openingCash: new Prisma.Decimal(data.openingCash.toString()),
        notes: data.notes,
        createdBy: data.userId,
      },
      include: {
        branch: true,
        user: true,
      },
    });
  }

  async calculateExpectedCash(shiftId: string) {
    const db = tenantDb(this.tenantId);
    const shift = await db.shift.findFirst({
      where: { id: shiftId },
      include: {
        sales: {
          include: {
            payments: true,
          },
        },
        transactions: true,
      },
    });

    if (!shift) {
      throw new Error(`Shift ${shiftId} not found`);
    }

    const openingCash = Number(shift.openingCash);

    // Sum cash payments from sales linked to this shift
    let cashSalesTotal = 0;
    for (const sale of shift.sales) {
      for (const payment of sale.payments) {
        if (payment.method === "CASH" && payment.status === "SUCCESS") {
          cashSalesTotal += Number(payment.amount);
        }
      }
    }

    // Sum manual cash drops, payouts, and adjustments
    let cashDropsTotal = 0;
    let payoutsTotal = 0;
    let adjustmentsTotal = 0;

    for (const tx of shift.transactions) {
      const amount = Number(tx.amount);
      if (tx.type === ShiftTransactionType.CASH_DROP) {
        cashDropsTotal += amount;
      } else if (tx.type === ShiftTransactionType.PAYOUT) {
        payoutsTotal += amount;
      } else if (tx.type === ShiftTransactionType.ADJUSTMENT) {
        adjustmentsTotal += amount;
      }
    }

    // Expected cash in register = Opening float + Cash Sales - Cash Drops - Payouts + Adjustments
    const expectedCash = openingCash + cashSalesTotal - cashDropsTotal - payoutsTotal + adjustmentsTotal;

    return {
      openingCash,
      cashSalesTotal,
      cashDropsTotal,
      payoutsTotal,
      adjustmentsTotal,
      expectedCash,
      salesCount: shift.sales.length,
    };
  }

  async closeShift(
    shiftId: string,
    data: {
      closingCash: number;
      expectedCash: number;
      variance: number;
      notes?: string;
      userId: string;
    }
  ) {
    const db = tenantDb(this.tenantId);
    return db.shift.update({
      where: { id: shiftId },
      data: {
        status: ShiftStatus.CLOSED,
        closingCash: new Prisma.Decimal(data.closingCash.toString()),
        expectedCash: new Prisma.Decimal(data.expectedCash.toString()),
        variance: new Prisma.Decimal(data.variance.toString()),
        closedAt: new Date(),
        notes: data.notes,
        updatedBy: data.userId,
      },
      include: {
        branch: true,
        user: true,
        transactions: true,
      },
    });
  }

  async createShiftTransaction(data: {
    shiftId: string;
    type: ShiftTransactionType;
    amount: number;
    reason?: string;
    userId: string;
  }) {
    const db = tenantDb(this.tenantId);
    return db.shiftTransaction.create({
      data: {
        shiftId: data.shiftId,
        type: data.type,
        amount: new Prisma.Decimal(data.amount.toString()),
        reason: data.reason,
        createdBy: data.userId,
      },
    });
  }

  async listShifts(params?: {
    branchId?: string;
    userId?: string;
    status?: ShiftStatus;
    limit?: number;
    offset?: number;
  }) {
    const db = tenantDb(this.tenantId);
    const where: any = {};
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.userId) where.userId = params.userId;
    if (params?.status) where.status = params.status;

    const [items, total] = await Promise.all([
      db.shift.findMany({
        where,
        take: params?.limit ?? 50,
        skip: params?.offset ?? 0,
        orderBy: { openedAt: "desc" },
        include: {
          user: true,
          branch: true,
          _count: {
            select: { sales: true, transactions: true },
          },
        },
      }),
      db.shift.count({ where }),
    ]);

    return { items, total };
  }
}
