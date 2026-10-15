import { z } from "zod";
import { TenantStatus } from "@prisma/client";

export const createTenantSchema = z.object({
  name: z.string().trim().min(2, "Tenant name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens"),
  status: z.nativeEnum(TenantStatus).default(TenantStatus.ACTIVE),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
