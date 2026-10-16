import { tenantDb } from "../lib/tenant/tenant-db";
import { prisma } from "../lib/db/prisma";
import { Prisma, LicenseStatus, LicenseType, AuditAction } from "@prisma/client";
import { AuditLogFilterInput, PharmacyLicenseInput } from "../validations/compliance.schema";

export class ComplianceRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // ============================================================================
  // 1. AUDIT LOG FORENSIC QUERIES
  // ============================================================================

  async listAuditLogs(filters: Partial<AuditLogFilterInput> = {}) {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: this.tenantId,
      ...(filters.entity ? { entity: filters.entity } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
              ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
            },
          }
        : {}),
    };

    const page = filters.page && !isNaN(Number(filters.page)) ? Math.max(1, Number(filters.page)) : 1;
    const limit = filters.limit && !isNaN(Number(filters.limit)) ? Math.min(100, Math.max(1, Number(filters.limit))) : 50;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: logs,
    };
  }

  // ============================================================================
  // 2. CONTROLLED SUBSTANCES REGULATORY LEDGER (CHAIN OF CUSTODY)
  // ============================================================================

  async getControlledSubstancesLedger(params: {
    medicineId?: string;
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = params.page && !isNaN(Number(params.page)) ? Math.max(1, Number(params.page)) : 1;
    const limit = params.limit && !isNaN(Number(params.limit)) ? Math.min(100, Math.max(1, Number(params.limit))) : 50;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryLedgerWhereInput = {
      tenantId: this.tenantId,
      medicine: {
        OR: [{ isControlled: true }, { isNarcotic: true }],
        ...(params.medicineId ? { id: params.medicineId } : {}),
      },
      ...(params.branchId ? { branchId: params.branchId } : {}),
      ...(params.startDate || params.endDate
        ? {
            createdAt: {
              ...(params.startDate ? { gte: params.startDate } : {}),
              ...(params.endDate ? { lte: params.endDate } : {}),
            },
          }
        : {}),
    };

    const [total, movements] = await Promise.all([
      this.db.inventoryLedger.count({ where }),
      this.db.inventoryLedger.findMany({
        where,
        include: {
          medicine: {
            select: {
              id: true,
              name: true,
              sku: true,
              strength: true,
              isControlled: true,
              isNarcotic: true,
              regulatorySchedule: true,
              category: { select: { name: true } },
            },
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
              purchasePrice: true,
              sellingPrice: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
    ]);

    // Enhance movements with upstream procurement or downstream clinical dispensing context
    const enhancedMovements = await Promise.all(
      movements.map(async (m: any) => {
        let clinicalContext: {
          doctor?: { id: string; name: string; licenseNumber: string | null; hospitalAffiliation: string | null };
          patient?: { id: string; name: string; dob?: Date | null; gender?: string | null };
          prescriptionNumber?: string | null;
        } | null = null;

        let procurementContext: {
          supplier?: { id: string; name: string; contactPerson: string | null; taxId: string | null };
          invoiceNumber?: string | null;
        } | null = null;

        if (m.referenceId) {
          if (m.transactionType === "SALE") {
            const sale = await prisma.sale.findFirst({
              where: { id: m.referenceId, tenantId: this.tenantId },
              include: {
                prescription: {
                  include: {
                    doctor: true,
                    patient: true,
                  },
                },
              },
            });

            if (sale?.prescription) {
              clinicalContext = {
                doctor: sale.prescription.doctor
                  ? {
                      id: sale.prescription.doctor.id,
                      name: sale.prescription.doctor.name,
                      licenseNumber: sale.prescription.doctor.licenseNumber,
                      hospitalAffiliation: sale.prescription.doctor.hospitalAffiliation,
                    }
                  : undefined,
                patient: {
                  id: sale.prescription.patient.id,
                  name: sale.prescription.patient.name,
                  dob: sale.prescription.patient.dob,
                  gender: sale.prescription.patient.gender,
                },
                prescriptionNumber: sale.prescription.prescriptionNumber,
              };
            }
          } else if (m.transactionType === "PURCHASE") {
            const purchase = await prisma.purchase.findFirst({
              where: { id: m.referenceId, tenantId: this.tenantId },
              include: {
                supplier: true,
              },
            });

            if (purchase) {
              procurementContext = {
                supplier: {
                  id: purchase.supplier.id,
                  name: purchase.supplier.name,
                  contactPerson: purchase.supplier.contactPerson,
                  taxId: purchase.supplier.taxId,
                },
                invoiceNumber: purchase.invoiceNumber,
              };
            }
          }
        }

        return {
          id: m.id,
          transactionType: m.transactionType,
          quantity: Number(m.quantity),
          notes: m.notes,
          createdAt: m.createdAt,
          createdBy: m.createdBy,
          medicine: m.medicine,
          batch: {
            ...m.batch,
            purchasePrice: Number(m.batch.purchasePrice),
            sellingPrice: Number(m.batch.sellingPrice),
          },
          branch: m.branch,
          clinicalContext,
          procurementContext,
        };
      })
    );

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: enhancedMovements,
    };
  }

  // ============================================================================
  // 3. REGULATORY LICENSES & PERMIT SURVEILLANCE
  // ============================================================================

  async listLicenses() {
    const licenses = await this.db.pharmacyLicense.findMany({
      where: { tenantId: this.tenantId },
      orderBy: { expiryDate: "asc" },
    });

    const now = new Date();
    const sixtyDaysThreshold = new Date(now.getTime() + 60 * 86400000);

    return licenses.map((lic: any) => {
      const expDate = new Date(lic.expiryDate);
      let calculatedStatus: LicenseStatus = lic.status;

      if (lic.status === LicenseStatus.ACTIVE) {
        if (expDate.getTime() < now.getTime()) {
          calculatedStatus = LicenseStatus.EXPIRED;
        }
      }

      const daysRemaining = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 60;

      return {
        id: lic.id,
        licenseType: lic.licenseType,
        licenseNumber: lic.licenseNumber,
        issueDate: lic.issueDate,
        expiryDate: lic.expiryDate,
        status: calculatedStatus,
        documentUrl: lic.documentUrl,
        daysRemaining,
        isExpiringSoon,
        createdAt: lic.createdAt,
        updatedAt: lic.updatedAt,
      };
    });
  }

  async createLicense(userId: string, input: PharmacyLicenseInput) {
    return this.db.pharmacyLicense.create({
      data: {
        tenantId: this.tenantId,
        licenseType: input.licenseType,
        licenseNumber: input.licenseNumber,
        issueDate: input.issueDate,
        expiryDate: input.expiryDate,
        status: input.status,
        documentUrl: input.documentUrl || null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateLicenseStatus(licenseId: string, status: LicenseStatus, userId: string) {
    return this.db.pharmacyLicense.update({
      where: { id: licenseId },
      data: {
        status,
        updatedBy: userId,
      },
    });
  }
}
