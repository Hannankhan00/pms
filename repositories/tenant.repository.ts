import { prisma } from "../lib/db/prisma";
import { Tenant } from "@prisma/client";

export class TenantRepository {
  async findById(id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { id },
      include: {
        branches: {
          where: { isActive: true },
        },
        _count: {
          select: {
            users: true,
            branches: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { slug },
    });
  }

  async updateSettings(
    id: string,
    data: { receiptHeader?: string | null; taxId?: string | null; defaultCurrency?: string }
  ): Promise<Tenant> {
    return prisma.tenant.update({
      where: { id },
      data,
    });
  }
}
