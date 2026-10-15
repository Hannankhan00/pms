import { z } from "zod";

export const DateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  branchId: z.string().uuid().optional(),
  timezoneOffset: z.coerce.number().optional(), // Minutes offset from UTC (e.g., -300 for PKT, 0 for UTC)
});

export type DateRangeQueryInput = z.infer<typeof DateRangeQuerySchema>;

export const SalesReportQuerySchema = DateRangeQuerySchema.extend({
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE", "BANK_TRANSFER", "CHEQUE", "ALL"]).optional(),
});

export type SalesReportQueryInput = z.infer<typeof SalesReportQuerySchema>;

export const InventoryValuationQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export type InventoryValuationQueryInput = z.infer<typeof InventoryValuationQuerySchema>;

export const InventoryExpiryQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  days: z.coerce.number().int().positive().default(90),
});

export type InventoryExpiryQueryInput = z.infer<typeof InventoryExpiryQuerySchema>;

export const InventoryMovementQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  fastMovingDays: z.coerce.number().int().positive().default(30),
  deadStockDays: z.coerce.number().int().positive().default(90),
  limit: z.coerce.number().int().positive().default(10),
});

export type InventoryMovementQueryInput = z.infer<typeof InventoryMovementQuerySchema>;

export const ShiftReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cashierId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  shiftId: z.string().uuid().optional(),
  hasDiscrepancy: z
    .preprocess(
      (val) => (val === "true" ? true : val === "false" ? false : undefined),
      z.boolean().optional()
    )
    .optional(),
});

export type ShiftReportQueryInput = z.infer<typeof ShiftReportQuerySchema>;

export const ClinicalReportQuerySchema = DateRangeQuerySchema.extend({
  doctorId: z.string().uuid().optional(),
});

export type ClinicalReportQueryInput = z.infer<typeof ClinicalReportQuerySchema>;
