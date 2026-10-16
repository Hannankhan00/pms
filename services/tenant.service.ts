import { TenantRepository } from "../repositories/tenant.repository";
import { NotFoundError, BusinessRuleError } from "../lib/errors/app-error";
import { TenantStatus } from "@prisma/client";

export class TenantService {
  private readonly repository: TenantRepository;

  constructor() {
    this.repository = new TenantRepository();
  }

  /**
   * Retrieves active tenant and verifies operational status.
   */
  async getTenant(tenantId: string) {
    const tenant = await this.repository.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError("Tenant", tenantId);
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new BusinessRuleError(
        `Pharmacy workspace is currently ${tenant.status.toLowerCase()}. Access is restricted.`
      );
    }

    return tenant;
  }

  /**
   * Updates localized tenant settings (receipt branding, tax ID, and default currency).
   */
  async updateSettings(
    tenantId: string,
    data: { receiptHeader?: string | null; taxId?: string | null; defaultCurrency?: string }
  ) {
    await this.getTenant(tenantId);
    return this.repository.updateSettings(tenantId, data);
  }
}
