import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const CreateExpenseCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional().nullable(),
});

export type CreateExpenseCategoryInput = z.infer<typeof CreateExpenseCategorySchema>;

export const CreateExpenseSchema = z.object({
  categoryId: z.string().uuid("Valid category ID required"),
  branchId: z.string().uuid("Valid branch ID required").optional().nullable(),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  date: z.coerce.date().optional(),
  description: z.string().trim().min(3, "Description must be at least 3 characters").max(1000),
  receiptUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal("")),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
});

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>;

export const ReverseExpenseSchema = z.object({
  reason: z.string().trim().min(3, "Reversal reason is required").max(500),
});

export type ReverseExpenseInput = z.infer<typeof ReverseExpenseSchema>;

export const RecordSupplierPaymentSchema = z.object({
  supplierId: z.string().uuid("Valid supplier ID required"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  method: z.nativeEnum(PaymentMethod),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  date: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  invoices: z
    .array(
      z.object({
        purchaseId: z.string().uuid("Valid purchase ID required"),
        amount: z.coerce.number().positive("Applied amount must be greater than zero"),
      })
    )
    .optional(),
});

export type RecordSupplierPaymentInput = z.infer<typeof RecordSupplierPaymentSchema>;

export const RecordCustomerPaymentSchema = z.object({
  customerId: z.string().uuid("Valid customer ID required"),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  method: z.nativeEnum(PaymentMethod),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  date: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  invoices: z
    .array(
      z.object({
        saleId: z.string().uuid("Valid sale ID required"),
        amount: z.coerce.number().positive("Applied amount must be greater than zero"),
      })
    )
    .optional(),
});

export type RecordCustomerPaymentInput = z.infer<typeof RecordCustomerPaymentSchema>;

export const GrossProfitQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  branchId: z.string().uuid().optional(),
});

export type GrossProfitQueryInput = z.infer<typeof GrossProfitQuerySchema>;
