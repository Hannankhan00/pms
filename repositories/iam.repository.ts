import { tenantDb } from "../lib/tenant/tenant-db";
import { CreateRoleInput, CreateStaffInput } from "../validations/iam.schema";
import { prisma } from "../lib/db/prisma";

export class IamRepository {
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  // --- Roles & Permissions ---
  async findRoles() {
    const db = tenantDb(this.tenantId);
    return db.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async findRoleById(id: string) {
    const db = tenantDb(this.tenantId);
    return db.role.findFirst({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async createRole(data: CreateRoleInput) {
    const db = tenantDb(this.tenantId);

    return db.transaction(async (txDb) => {
      const role = await txDb.role.create({
        data: {
          name: data.name,
          description: data.description,
          isSystem: false,
        },
      });

      if (data.permissionIds.length > 0) {
        await txDb.rawClient.rolePermission.createMany({
          data: data.permissionIds.map((pId) => ({
            roleId: role.id,
            permissionId: pId,
          })),
        });
      }

      return role;
    });
  }

  async findPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });
  }

  // --- Staff Management ---
  async findStaff() {
    const db = tenantDb(this.tenantId);
    return db.user.findMany({
      include: {
        role: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findStaffById(id: string) {
    const db = tenantDb(this.tenantId);
    return db.user.findFirst({
      where: { id },
      include: {
        role: true,
        branch: true,
      },
    });
  }

  async createStaff(data: CreateStaffInput) {
    const db = tenantDb(this.tenantId);
    const hubUserId = data.hubUserId || `hub-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return db.user.create({
      data: {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        branchId: data.branchId || undefined,
        hubUserId,
        locale: data.locale,
        isActive: data.isActive,
      },
      include: {
        role: true,
        branch: true,
      },
    });
  }

  async updateStaffStatus(id: string, isActive: boolean) {
    const db = tenantDb(this.tenantId);
    return db.user.update({
      where: { id },
      data: { isActive },
      include: {
        role: true,
        branch: true,
      },
    });
  }
}
