import { IamRepository } from "../repositories/iam.repository";
import { CreateRoleSchema, CreateStaffSchema, UpdateStaffStatusSchema } from "../validations/iam.schema";
import { ValidationError, NotFoundError, ConflictError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";

export class IamService {
  private readonly repository: IamRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new IamRepository(tenantId);
  }

  // --- Roles & Permissions ---
  async listRoles(userId: string) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.ROLES_VIEW);
    return this.repository.findRoles();
  }

  async listPermissions(userId: string) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.ROLES_VIEW);
    return this.repository.findPermissions();
  }

  async createRole(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.ROLES_MANAGE);

    const parsed = CreateRoleSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid role input", parsed.error.format());
    }

    return this.repository.createRole(parsed.data);
  }

  // --- Staff Management ---
  async listStaff(userId: string) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.STAFF_VIEW);
    return this.repository.findStaff();
  }

  async createStaff(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.STAFF_MANAGE);

    const parsed = CreateStaffSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid staff input", parsed.error.format());
    }

    return this.repository.createStaff(parsed.data);
  }

  async toggleStaffStatus(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.STAFF_MANAGE);

    const parsed = UpdateStaffStatusSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid staff status input", parsed.error.format());
    }

    const staff = await this.repository.findStaffById(parsed.data.staffId);
    if (!staff) {
      throw new NotFoundError("Staff User", parsed.data.staffId);
    }

    return this.repository.updateStaffStatus(parsed.data.staffId, parsed.data.isActive);
  }
}
