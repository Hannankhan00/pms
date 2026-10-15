import { z } from "zod";

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(191),
  contactPerson: z.string().max(150).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().max(255).optional(),
  taxId: z.string().max(100).optional(),
});

export const PurchaseItemInputSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine ID"),
  batchNumber: z.string().min(1, "Batch number is required").max(100),
  expiryDate: z.coerce.date(),
  mfgDate: z.coerce.date().optional(),
  quantity: z.number().int().positive("Quantity must be greater than 0"),
  unitPrice: z.number().positive("Unit purchase price must be greater than 0"),
  sellingPrice: z.number().positive("Selling price must be greater than 0"),
  tax: z.number().min(0).default(0),
});

export const CreatePurchaseSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID"),
  branchId: z.string().uuid().optional(),
  warehouseId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required").max(100),
  purchaseDate: z.coerce.date().default(() => new Date()),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  notes: z.string().max(255).optional(),
  items: z.array(PurchaseItemInputSchema).min(1, "At least one item is required in a purchase order"),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export type PurchaseItemInput = z.infer<typeof PurchaseItemInputSchema>;
export type CreatePurchaseInput = z.infer<typeof CreatePurchaseSchema>;
