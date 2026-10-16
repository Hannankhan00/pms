import { tenantDb } from "../lib/tenant/tenant-db";
import { ImportEntity, ImportStatus, Prisma } from "@prisma/client";
import { parseCsv } from "../lib/utils/csv-parser";

export interface MigrationRowError {
  row: number;
  identifier?: string;
  error: string;
}

export class MigrationService {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  /**
   * Processes an uploaded CSV file idempotently for the specified entity.
   */
  async processCsvImport(params: {
    userId: string;
    entity: ImportEntity;
    csvContent: string;
  }) {
    const parseResult = parseCsv(params.csvContent);

    // Initialize tracking job
    const job = await this.db.dataImportJob.create({
      data: {
        tenantId: this.tenantId,
        entity: params.entity,
        status: ImportStatus.PROCESSING,
        totalRows: parseResult.rows.length,
        successRows: 0,
        failedRows: parseResult.errors.length,
        errorLog: parseResult.errors.map((e) => ({
          row: e.row,
          error: e.message,
        })) as unknown as Prisma.InputJsonValue,
        createdBy: params.userId,
      },
    });

    const rowErrors: MigrationRowError[] = parseResult.errors.map((e) => ({
      row: e.row,
      error: e.message,
    }));

    let successCount = 0;

    for (let index = 0; index < parseResult.rows.length; index++) {
      const row = parseResult.rows[index];
      const rowNumber = index + 2; // +1 for 0-index, +1 for header line

      try {
        switch (params.entity) {
          case ImportEntity.MEDICINE:
            await this.upsertMedicine(row);
            successCount++;
            break;

          case ImportEntity.SUPPLIER:
            await this.upsertSupplier(row);
            successCount++;
            break;

          case ImportEntity.CUSTOMER:
            await this.upsertCustomer(row);
            successCount++;
            break;

          default:
            throw new Error(`Unsupported migration entity: ${params.entity}`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to import row";
        rowErrors.push({
          row: rowNumber,
          identifier: row.sku || row.name || row.phone || `Row #${rowNumber}`,
          error: errorMsg,
        });
      }
    }

    const failedCount = rowErrors.length;
    const finalStatus =
      successCount > 0 ? ImportStatus.COMPLETED : failedCount > 0 ? ImportStatus.FAILED : ImportStatus.COMPLETED;

    // Update job summary
    const updatedJob = await this.db.dataImportJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        successRows: successCount,
        failedRows: failedCount,
        errorLog: rowErrors as unknown as Prisma.InputJsonValue,
      },
    });

    return updatedJob;
  }

  /**
   * Idempotently upserts a medicine based on (tenantId, sku).
   */
  private async upsertMedicine(row: Record<string, string>) {
    const sku = row.sku?.trim();
    const name = row.name?.trim();

    if (!sku) throw new Error("Missing required field: sku");
    if (!name) throw new Error("Missing required field: name");

    // Resolve or create category
    let categoryId = row.categoryId?.trim();
    const categoryName = row.category?.trim();

    if (!categoryId && categoryName) {
      const category = await this.db.category.upsert({
        where: {
          tenantId_name: {
            tenantId: this.tenantId,
            name: categoryName,
          },
        },
        update: {},
        create: {
          tenantId: this.tenantId,
          name: categoryName,
          description: `Imported category: ${categoryName}`,
        },
      });
      categoryId = category.id;
    }

    if (!categoryId) {
      // Default fallback category if none specified
      const defaultCategory = await this.db.category.upsert({
        where: {
          tenantId_name: {
            tenantId: this.tenantId,
            name: "General",
          },
        },
        update: {},
        create: {
          tenantId: this.tenantId,
          name: "General",
          description: "General imported category",
        },
      });
      categoryId = defaultCategory.id;
    }

    const isControlled = row.isControlled === "true" || row.isControlled === "1";
    const isNarcotic = row.isNarcotic === "true" || row.isNarcotic === "1";
    const requiresPrescription = row.requiresPrescription === "true" || row.requiresPrescription === "1";
    const minStockLevel = row.minStockLevel ? parseInt(row.minStockLevel, 10) : 10;
    const maxStockLevel = row.maxStockLevel ? parseInt(row.maxStockLevel, 10) : 1000;
    const reorderPoint = row.reorderPoint ? parseInt(row.reorderPoint, 10) : 20;

    // Perform Idempotent Upsert
    return this.db.medicine.upsert({
      where: {
        tenantId_sku: {
          tenantId: this.tenantId,
          sku,
        },
      },
      update: {
        name,
        categoryId,
        strength: row.strength?.trim() || null,
        isControlled,
        regulatorySchedule: row.regulatorySchedule?.trim() || null,
        isNarcotic,
        isPrescriptionRequired: requiresPrescription,
        minStockLevel: isNaN(minStockLevel) ? 10 : minStockLevel,
        maxStockLevel: isNaN(maxStockLevel) ? 1000 : maxStockLevel,
        reorderLevel: isNaN(reorderPoint) ? 20 : reorderPoint,
      },
      create: {
        tenantId: this.tenantId,
        sku,
        name,
        categoryId,
        strength: row.strength?.trim() || null,
        isControlled,
        regulatorySchedule: row.regulatorySchedule?.trim() || null,
        isNarcotic,
        isPrescriptionRequired: requiresPrescription,
        minStockLevel: isNaN(minStockLevel) ? 10 : minStockLevel,
        maxStockLevel: isNaN(maxStockLevel) ? 1000 : maxStockLevel,
        reorderLevel: isNaN(reorderPoint) ? 20 : reorderPoint,
      },
    });
  }

  /**
   * Idempotently upserts a supplier based on (tenantId, name).
   */
  private async upsertSupplier(row: Record<string, string>) {
    const name = row.name?.trim();
    if (!name) throw new Error("Missing required field: name");

    const email = row.email?.trim() || null;
    const phone = row.phone?.trim() || null;
    const contactPerson = row.contactPerson?.trim() || null;
    const address = row.address?.trim() || null;
    const taxNumber = row.taxNumber?.trim() || null;

    // Check if supplier already exists by tenant + name or email
    const existing = await this.db.supplier.findFirst({
      where: {
        tenantId: this.tenantId,
        OR: [{ name }, ...(email ? [{ email }] : [])],
      },
    });

    if (existing) {
      return this.db.supplier.update({
        where: { id: existing.id },
        data: {
          name,
          email,
          phone,
          contactPerson,
          address,
          taxNumber,
        },
      });
    }

    return this.db.supplier.create({
      data: {
        tenantId: this.tenantId,
        name,
        email,
        phone,
        contactPerson,
        address,
        taxNumber,
      },
    });
  }

  /**
   * Idempotently upserts a customer based on (tenantId, phone) or email.
   */
  private async upsertCustomer(row: Record<string, string>) {
    const name = row.name?.trim();
    if (!name) throw new Error("Missing required field: name");

    const phone = row.phone?.trim() || null;
    const email = row.email?.trim() || null;
    const address = row.address?.trim() || null;
    const creditLimit = row.creditLimit ? parseFloat(row.creditLimit) : 0;

    const existing = await this.db.customer.findFirst({
      where: {
        tenantId: this.tenantId,
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
          { name },
        ],
      },
    });

    if (existing) {
      return this.db.customer.update({
        where: { id: existing.id },
        data: {
          name,
          phone,
          email,
          address,
          creditLimit: isNaN(creditLimit) ? 0 : creditLimit,
        },
      });
    }

    return this.db.customer.create({
      data: {
        tenantId: this.tenantId,
        name,
        phone,
        email,
        address,
        creditLimit: isNaN(creditLimit) ? 0 : creditLimit,
      },
    });
  }

  async listImportJobs() {
    return this.db.dataImportJob.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }
}
