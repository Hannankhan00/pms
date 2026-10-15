import { tenantDb } from "../lib/tenant/tenant-db";
import { CreateBranchInput, UpdateBranchInput } from "../validations/branch.schema";
import { Branch } from "@prisma/client";

export class BranchRepository {
  private readonly db;

  constructor(tenantId: string) {
    this.db = tenantDb(tenantId);
  }

  async findById(id: string): Promise<Branch | null> {
    return this.db.branch.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Branch | null> {
    return this.db.branch.findFirst({
      where: { code },
    });
  }

  async findAll(options?: { activeOnly?: boolean }): Promise<Branch[]> {
    return this.db.branch.findMany({
      where: options?.activeOnly ? { isActive: true } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: CreateBranchInput): Promise<Branch> {
    return this.db.branch.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        isActive: data.isActive,
      },
    });
  }

  async update(id: string, data: Partial<UpdateBranchInput>): Promise<Branch> {
    return this.db.branch.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async count(): Promise<number> {
    return this.db.branch.count();
  }
}
