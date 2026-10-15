import { prisma } from "../db/prisma";
import { Prisma, PrismaClient, Branch, PharmacyUser, Role } from "@prisma/client";
import { TenantMismatchError } from "../errors/app-error";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export type BranchCreateData = Omit<Prisma.BranchUncheckedCreateInput, "tenantId"> & {
  tenantId?: string;
};

export type UserCreateData = Omit<Prisma.PharmacyUserUncheckedCreateInput, "tenantId"> & {
  tenantId?: string;
};

/**
 * Creates a generic tenant-scoped delegate for any Prisma model that has a tenantId field.
 */
function createTenantModelDelegate<T extends Record<string, any>>(
  modelDelegate: any,
  tenantId: string
) {
  if (!modelDelegate) return undefined;

  return {
    findMany: (args?: any) => {
      return modelDelegate.findMany({
        ...args,
        where: {
          ...args?.where,
          tenantId,
        },
      });
    },

    findFirst: (args?: any) => {
      return modelDelegate.findFirst({
        ...args,
        where: {
          ...args?.where,
          tenantId,
        },
      });
    },

    findUnique: async (args: { where: any; include?: any; select?: any }) => {
      // Check for direct or nested tenantId mismatches in where
      if (args.where.tenantId && args.where.tenantId !== tenantId) {
        throw new TenantMismatchError("Cannot query record for a different tenant");
      }

      for (const key of Object.keys(args.where)) {
        const val = args.where[key];
        if (val && typeof val === "object" && "tenantId" in val) {
          if (val.tenantId !== tenantId) {
            throw new TenantMismatchError("Cannot query record for a different tenant");
          }
        }
      }

      // Flatten compound keys (e.g. tenantId_code) into a clean where condition for findFirst
      const where: any = { tenantId };
      for (const [k, v] of Object.entries(args.where)) {
        if (v && typeof v === "object" && "tenantId" in (v as any)) {
          Object.assign(where, v);
        } else {
          where[k] = v;
        }
      }
      where.tenantId = tenantId;

      return modelDelegate.findFirst({
        where,
        include: args.include,
        select: args.select,
      });
    },

    create: (args: { data: any; include?: any; select?: any }) => {
      if (args.data.tenantId && args.data.tenantId !== tenantId) {
        throw new TenantMismatchError("Cannot create record for a different tenant");
      }
      return modelDelegate.create({
        ...args,
        data: {
          ...args.data,
          tenantId,
        },
      });
    },

    createMany: (args: { data: any[]; skipDuplicates?: boolean }) => {
      const scopedData = args.data.map((item) => {
        if (item.tenantId && item.tenantId !== tenantId) {
          throw new TenantMismatchError("Cannot create record for a different tenant");
        }
        return {
          ...item,
          tenantId,
        };
      });
      return modelDelegate.createMany({
        data: scopedData,
        skipDuplicates: args.skipDuplicates,
      });
    },

    update: async (args: { where: { id: string }; data: any; include?: any; select?: any }) => {
      const existing = await modelDelegate.findFirst({
        where: { id: args.where.id, tenantId },
        select: { id: true },
      });
      if (!existing) {
        throw new TenantMismatchError("Record not found under this tenant context");
      }
      return modelDelegate.update({
        where: { id: args.where.id },
        data: args.data,
        include: args.include,
        select: args.select,
      });
    },

    updateMany: (args: any) => {
      return modelDelegate.updateMany({
        ...args,
        where: {
          ...args?.where,
          tenantId,
        },
      });
    },

    delete: async (args: { where: { id: string } }) => {
      const existing = await modelDelegate.findFirst({
        where: { id: args.where.id, tenantId },
        select: { id: true },
      });
      if (!existing) {
        throw new TenantMismatchError("Record not found under this tenant context");
      }
      return modelDelegate.delete({
        where: { id: args.where.id },
      });
    },

    deleteMany: (args?: any) => {
      return modelDelegate.deleteMany({
        ...args,
        where: {
          ...args?.where,
          tenantId,
        },
      });
    },

    count: (args?: any) => {
      return modelDelegate.count({
        ...args,
        where: {
          ...args?.where,
          tenantId,
        },
      });
    },

    aggregate: (args?: any) => {
      return modelDelegate.aggregate({
        ...args,
        where: {
          ...args?.where,
          tenantId,
        },
      });
    },
  };
}

export interface TenantDb {
  readonly tenantId: string;
  readonly rawClient: DatabaseClient;

  // Facilities
  branch: any;
  warehouse: any;
  storageLocation: any;

  // RBAC & Identity
  user: any;
  role: any;
  permission: any;
  rolePermission: any;

  // Shifts & Cash Management
  shift: any;
  shiftTransaction: any;

  // Medicine Master (Catalog)
  category: any;
  manufacturer: any;
  generic: any;
  brand: any;
  dosageForm: any;
  unit: any;
  medicine: any;

  // Inventory & Batches
  medicineBatch: any;
  inventoryLedger: any;

  // CRM & Clinical
  supplier: any;
  customer: any;
  patient: any;
  doctor: any;

  // Procurement & POS
  purchase: any;
  purchaseItem: any;
  sale: any;
  saleItem: any;
  payment: any;
  prescription: any;
  prescriptionItem: any;

  // Finance & Audit
  expense: any;
  auditLog: any;

  transaction: <T>(fn: (txDb: TenantDb) => Promise<T>) => Promise<T>;
}

/**
 * Creates a tenant-isolated database access interface.
 * All queries executed through tenantDb automatically enforce tenantId filtering.
 */
export function tenantDb(tenantId: string, client: DatabaseClient = prisma): TenantDb {
  if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new TenantMismatchError("Invalid or missing tenantId in tenantDb initialization");
  }

  const c = client as any;

  return {
    get tenantId() {
      return tenantId;
    },
    get rawClient() {
      return client;
    },

    // Facilities
    branch: createTenantModelDelegate(c.branch, tenantId),
    warehouse: createTenantModelDelegate(c.warehouse, tenantId),
    storageLocation: createTenantModelDelegate(c.storageLocation, tenantId),

    // RBAC & Identity
    user: createTenantModelDelegate(c.pharmacyUser, tenantId),
    role: {
      findMany: (args?: Prisma.RoleFindManyArgs) => {
        return client.role.findMany({
          ...args,
          where: {
            ...args?.where,
            OR: [{ tenantId }, { tenantId: null, isSystem: true }],
          },
        });
      },
      findFirst: (args?: Prisma.RoleFindFirstArgs) => {
        return client.role.findFirst({
          ...args,
          where: {
            ...args?.where,
            OR: [{ tenantId }, { tenantId: null, isSystem: true }],
          },
        });
      },
      findUnique: (args: Prisma.RoleFindUniqueArgs) => {
        return client.role.findFirst({
          where: {
            ...args.where,
            OR: [{ tenantId }, { tenantId: null, isSystem: true }],
          },
        });
      },
      create: (args: Prisma.RoleCreateArgs) => {
        return client.role.create({
          ...args,
          data: {
            ...args.data,
            tenantId,
          } as any,
        });
      },
    },
    permission: c.permission,
    rolePermission: c.rolePermission,

    // Shifts & Cash Management
    shift: createTenantModelDelegate(c.shift, tenantId),
    shiftTransaction: createTenantModelDelegate(c.shiftTransaction, tenantId),

    // Medicine Master (Catalog)
    category: createTenantModelDelegate(c.category, tenantId),
    manufacturer: createTenantModelDelegate(c.manufacturer, tenantId),
    generic: createTenantModelDelegate(c.generic, tenantId),
    brand: createTenantModelDelegate(c.brand, tenantId),
    dosageForm: createTenantModelDelegate(c.dosageForm, tenantId),
    unit: createTenantModelDelegate(c.unit, tenantId),
    medicine: createTenantModelDelegate(c.medicine, tenantId),

    // Inventory & Batches
    medicineBatch: createTenantModelDelegate(c.medicineBatch, tenantId),
    inventoryLedger: createTenantModelDelegate(c.inventoryLedger, tenantId),

    // CRM & Clinical
    supplier: createTenantModelDelegate(c.supplier, tenantId),
    customer: createTenantModelDelegate(c.customer, tenantId),
    patient: createTenantModelDelegate(c.patient, tenantId),
    doctor: createTenantModelDelegate(c.doctor, tenantId),

    // Procurement & POS
    purchase: createTenantModelDelegate(c.purchase, tenantId),
    purchaseItem: c.purchaseItem,
    sale: createTenantModelDelegate(c.sale, tenantId),
    saleItem: c.saleItem,
    payment: createTenantModelDelegate(c.payment, tenantId),
    prescription: createTenantModelDelegate(c.prescription, tenantId),
    prescriptionItem: c.prescriptionItem,

    // Finance & Audit
    expense: createTenantModelDelegate(c.expense, tenantId),
    auditLog: createTenantModelDelegate(c.auditLog, tenantId),

    /**
     * Runs operations in a database transaction with tenant scope preserved.
     */
    transaction: async <T>(fn: (txDb: TenantDb) => Promise<T>): Promise<T> => {
      if ("$transaction" in client && typeof (client as PrismaClient).$transaction === "function") {
        return (client as PrismaClient).$transaction(async (tx) => {
          return fn(tenantDb(tenantId, tx));
        });
      }
      return fn(tenantDb(tenantId, client));
    },
  };
}
