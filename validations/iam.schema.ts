import { z } from "zod";

export const CreateRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(100),
  description: z.string().max(255).optional(),
  permissionIds: z.array(z.string().uuid("Invalid permission ID")).min(1, "Select at least one permission"),
});

export const CreateStaffSchema = z.object({
  name: z.string().min(1, "Staff name is required").max(191),
  email: z.string().email("Valid email is required").max(191),
  roleId: z.string().uuid("Invalid role ID"),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  hubUserId: z.string().min(1).max(191).optional(),
  locale: z.enum(["en", "ar", "fr", "it"]).default("en"),
  isActive: z.boolean().default(true),
});

export const UpdateStaffStatusSchema = z.object({
  staffId: z.string().uuid("Invalid staff ID"),
  isActive: z.boolean(),
});

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffStatusInput = z.infer<typeof UpdateStaffStatusSchema>;
