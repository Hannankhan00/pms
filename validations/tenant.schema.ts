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

export const provisionTenantSchema = z.object({
  hubTenantId: z.string().trim().min(1, "Hub Tenant ID is required"),
  name: z.string().trim().min(2, "Pharmacy name must be at least 2 characters").max(191),
  adminHubUserId: z.string().trim().min(1, "Admin Hub User ID is required"),
  adminEmail: z.string().trim().email("Valid admin email is required"),
  adminName: z.string().trim().min(1, "Admin name is required"),
});

import { sanitizedOptionalString } from "@/lib/security/sanitize";

export const tenantSettingsSchema = z.object({
  receiptHeader: sanitizedOptionalString(1000),
  taxId: z.string().max(100).optional().nullable(),
  defaultCurrency: z.string().min(1).max(10).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>;
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;
