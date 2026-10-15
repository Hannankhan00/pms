import { z } from "zod";
import { InventoryTransactionType } from "@prisma/client";

export const StockAdjustmentSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine ID"),
  batchId: z.string().uuid("Invalid batch ID"),
  branchId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  storageLocationId: z.string().uuid().optional(),
  quantity: z.number().refine((val) => val !== 0, "Adjustment quantity cannot be 0"),
  notes: z.string().min(1, "Notes explaining adjustment reason are required").max(255),
});

export const StockQuerySchema = z.object({
  medicineId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  batchId: z.string().uuid().optional(),
  transactionType: z.nativeEnum(InventoryTransactionType).optional(),
});

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
export type StockQueryInput = z.infer<typeof StockQuerySchema>;
