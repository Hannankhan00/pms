import { tenantDb } from "../lib/tenant/tenant-db";
import { CreateSupplierInput } from "../validations/procurement.schema";
import { Supplier, Purchase, PurchaseStatus, Prisma } from "@prisma/client";

export class ProcurementRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // --- Supplier ---
  async createSupplier(data: CreateSupplierInput): Promise<Supplier> {
    return this.db.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        taxId: data.taxId,
      },
    });
  }

  async findSuppliers(): Promise<Supplier[]> {
    return this.db.supplier.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  async findSupplierById(id: string): Promise<Supplier | null> {
    return this.db.supplier.findUnique({
      where: { id },
    });
  }

  // --- Purchase Orders ---
  async findPurchaseByInvoice(supplierId: string, invoiceNumber: string): Promise<Purchase | null> {
    return this.db.purchase.findFirst({
      where: {
        supplierId,
        invoiceNumber,
        isDeleted: false,
      },
    });
  }

  async findPurchases(params?: {
    supplierId?: string;
    branchId?: string;
    status?: PurchaseStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.PurchaseWhereInput = {
      isDeleted: false,
      ...(params?.supplierId ? { supplierId: params.supplierId } : {}),
      ...(params?.branchId ? { branchId: params.branchId } : {}),
      ...(params?.status ? { status: params.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.purchase.findMany({
        where,
        include: {
          supplier: true,
          branch: true,
          items: {
            include: {
              medicine: true,
              batch: true,
            },
          },
        },
        orderBy: { purchaseDate: "desc" },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      this.db.purchase.count({ where }),
    ]);

    return { items, total };
  }

  async findPurchaseById(id: string) {
    return this.db.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        branch: true,
        items: {
          include: {
            medicine: true,
            batch: true,
          },
        },
      },
    });
  }
}
