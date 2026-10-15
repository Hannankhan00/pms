import { tenantDb } from "../lib/tenant/tenant-db";
import { Sale, SaleStatus, Prisma } from "@prisma/client";

export class SalesRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  async findSales(params?: {
    branchId?: string;
    customerId?: string;
    status?: SaleStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.SaleWhereInput = {
      isDeleted: false,
      ...(params?.branchId ? { branchId: params.branchId } : {}),
      ...(params?.customerId ? { customerId: params.customerId } : {}),
      ...(params?.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.sale.findMany({
        where,
        include: {
          branch: true,
          customer: true,
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
          payments: true,
        },
        orderBy: { saleDate: "desc" },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      this.db.sale.count({ where }),
    ]);

    return { items, total };
  }

  async findSaleById(id: string) {
    return this.db.sale.findUnique({
      where: { id },
      include: {
        branch: true,
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
        payments: true,
      },
    });
  }

  async findSaleByReceiptNumber(receiptNumber: string): Promise<Sale | null> {
    return this.db.sale.findFirst({
      where: { receiptNumber, isDeleted: false },
    });
  }
}
