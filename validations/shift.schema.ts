import { z } from "zod";

export const OpenShiftSchema = z
  .object({
    branchId: z.string().uuid("Invalid branch ID").optional(),
    openingCash: z.number().min(0, "Opening float cannot be negative").optional(),
    openingFloat: z.number().min(0, "Opening float cannot be negative").optional(),
    notes: z.string().max(255).optional(),
  })
  .transform((data) => ({
    ...data,
    openingCash: data.openingCash ?? data.openingFloat ?? 0,
  }));

export const CloseShiftSchema = z.object({
  shiftId: z.string().uuid("Invalid shift ID"),
  closingCash: z.number().min(0, "Counted cash cannot be negative"),
  notes: z.string().max(255).optional(),
});

export const ShiftTransactionSchema = z.object({
  shiftId: z.string().uuid("Invalid shift ID"),
  type: z.enum(["CASH_DROP", "PAYOUT", "ADJUSTMENT"]),
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.string().min(1, "Reason is required").max(255),
});

export type OpenShiftInput = z.infer<typeof OpenShiftSchema>;
export type CloseShiftInput = z.infer<typeof CloseShiftSchema>;
export type ShiftTransactionInput = z.infer<typeof ShiftTransactionSchema>;
