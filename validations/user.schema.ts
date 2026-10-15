import { z } from "zod";

export const createPharmacyUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address"),
  roleId: z.string().min(1, "Role ID is required"),
  hubUserId: z.string().min(1, "Hub User ID is required"),
  isActive: z.boolean().default(true),
});

export const updatePharmacyUserSchema = createPharmacyUserSchema.partial();

export type CreatePharmacyUserInput = z.infer<typeof createPharmacyUserSchema>;
export type UpdatePharmacyUserInput = z.infer<typeof updatePharmacyUserSchema>;
