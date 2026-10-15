import { BranchRepository } from "../repositories/branch.repository";
import {
  createBranchSchema,
  updateBranchSchema,
  CreateBranchInput,
  UpdateBranchInput,
} from "../validations/branch.schema";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions";
import { logger } from "../lib/logging/logger";

export class BranchService {
  private readonly repository: BranchRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new BranchRepository(tenantId);
  }

  /**
   * List all branches for the active tenant.
   * Requires 'users.view' permission.
   */
  async listBranches(options?: { activeOnly?: boolean }) {
    await requirePermission(PERMISSIONS.USERS_VIEW, { tenantId: this.tenantId });
    return this.repository.findAll(options);
  }

  /**
   * Retrieve a specific branch by ID.
   * Requires 'users.view' permission.
   */
  async getBranchById(id: string) {
    await requirePermission(PERMISSIONS.USERS_VIEW, { tenantId: this.tenantId });
    const branch = await this.repository.findById(id);
    if (!branch) {
      throw new NotFoundError("Branch", id);
    }
    return branch;
  }

  /**
   * Create a new pharmacy branch.
   * Requires 'users.manage' permission.
   */
  async createBranch(input: CreateBranchInput) {
    await requirePermission(PERMISSIONS.USERS_MANAGE, { tenantId: this.tenantId });

    // 1. Validate Input
    const parsed = createBranchSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid branch payload", parsed.error.format());
    }

    // 2. Check Business Rules: Code must be unique within tenant
    const existing = await this.repository.findByCode(parsed.data.code);
    if (existing) {
      throw new ConflictError(
        `A branch with code '${parsed.data.code}' already exists in this pharmacy.`
      );
    }

    // 3. Persist via repository
    const created = await this.repository.create(parsed.data);

    logger.info("Branch created successfully", {
      tenantId: this.tenantId,
      branchId: created.id,
      code: created.code,
    });

    return created;
  }

  /**
   * Update branch metadata or active status.
   * Requires 'users.manage' permission.
   */
  async updateBranch(input: UpdateBranchInput) {
    await requirePermission(PERMISSIONS.USERS_MANAGE, { tenantId: this.tenantId });

    const parsed = updateBranchSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid update branch payload", parsed.error.format());
    }

    const branch = await this.repository.findById(parsed.data.id);
    if (!branch) {
      throw new NotFoundError("Branch", parsed.data.id);
    }

    // Business rule: If deactivating, ensure at least one active branch remains
    if (parsed.data.isActive === false && branch.isActive) {
      const activeBranches = await this.repository.findAll({ activeOnly: true });
      if (activeBranches.length <= 1) {
        throw new BusinessRuleError(
          "Cannot deactivate the only remaining active branch for this pharmacy."
        );
      }
    }

    // Business rule: If changing code, check uniqueness
    if (parsed.data.code && parsed.data.code !== branch.code) {
      const existingWithCode = await this.repository.findByCode(parsed.data.code);
      if (existingWithCode && existingWithCode.id !== branch.id) {
        throw new ConflictError(
          `Branch code '${parsed.data.code}' is already assigned to another branch.`
        );
      }
    }

    const updated = await this.repository.update(parsed.data.id, parsed.data);

    logger.info("Branch updated successfully", {
      tenantId: this.tenantId,
      branchId: updated.id,
    });

    return updated;
  }
}
