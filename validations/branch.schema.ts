import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().trim().min(2, "Branch name must be at least 2 characters").max(100),
  code: z
    .string()
    .trim()
    .min(2, "Branch code must be at least 2 characters")
    .max(20)
    .regex(
      /^[A-Z0-9_-]+$/i,
      "Branch code can only contain letters, numbers, dashes, and underscores"
    ),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
  isActive: z.boolean().default(true),
});

export const updateBranchSchema = createBranchSchema.partial().extend({
  id: z.string().uuid("Invalid branch ID format"),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
