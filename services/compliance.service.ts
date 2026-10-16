import { ComplianceRepository } from "../repositories/compliance.repository";
import { AuditService } from "./audit.service";
import { parseDateRange } from "../lib/utils/date-helpers";
import {
  AuditLogFilterInput,
  ControlledSubstanceFilterInput,
  PharmacyLicenseInput,
} from "../validations/compliance.schema";
import { LicenseStatus, AuditAction } from "@prisma/client";

export class ComplianceService {
  private readonly complianceRepo: ComplianceRepository;
  private readonly auditService: AuditService;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.complianceRepo = new ComplianceRepository(tenantId);
    this.auditService = new AuditService(tenantId);
  }

  // ============================================================================
  // 1. FORENSIC AUDIT TRAIL
  // ============================================================================

  async listAuditLogs(query: Partial<AuditLogFilterInput> = {}) {
    return this.complianceRepo.listAuditLogs(query);
  }

  // ============================================================================
  // 2. CONTROLLED SUBSTANCES REGULATORY LEDGER
  // ============================================================================

  async getControlledSubstancesLedger(query: Partial<ControlledSubstanceFilterInput> = {}) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (query.startDate || query.endDate) {
      const parsed = parseDateRange({
        startDate: query.startDate,
        endDate: query.endDate,
      });
      start = parsed.start;
      end = parsed.end;
    }

    return this.complianceRepo.getControlledSubstancesLedger({
      medicineId: query.medicineId,
      branchId: query.branchId,
      startDate: start,
      endDate: end,
      page: query.page,
      limit: query.limit,
    });
  }

  // ============================================================================
  // 3. REGULATORY LICENSES & PERMITS
  // ============================================================================

  async listLicenses() {
    return this.complianceRepo.listLicenses();
  }

  async createLicense(userId: string, input: PharmacyLicenseInput) {
    const license = await this.complianceRepo.createLicense(userId, input);

    // Record immutable audit entry
    await this.auditService.logMutation({
      tenantId: this.tenantId,
      userId,
      action: AuditAction.CREATE,
      entity: "PharmacyLicense",
      entityId: license.id,
      oldValues: null,
      newValues: {
        licenseType: license.licenseType,
        licenseNumber: license.licenseNumber,
        issueDate: license.issueDate,
        expiryDate: license.expiryDate,
        status: license.status,
      },
    });

    return license;
  }

  async updateLicenseStatus(userId: string, licenseId: string, status: LicenseStatus) {
    const updated = await this.complianceRepo.updateLicenseStatus(licenseId, status, userId);

    await this.auditService.logMutation({
      tenantId: this.tenantId,
      userId,
      action: AuditAction.UPDATE,
      entity: "PharmacyLicense",
      entityId: licenseId,
      oldValues: { status: "PREVIOUS" },
      newValues: { status },
    });

    return updated;
  }
}
