import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  nameAr: z.string().max(100).optional(),
  nameFr: z.string().max(100).optional(),
  nameIt: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
});

export const CreateManufacturerSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  contactInfo: z.string().max(255).optional(),
  address: z.string().max(255).optional(),
  description: z.string().max(255).optional(),
});

export const CreateGenericSchema = z.object({
  name: z.string().min(1, "Generic name is required").max(150),
  description: z.string().max(255).optional(),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(150),
  description: z.string().max(255).optional(),
});

export const CreateDosageFormSchema = z.object({
  name: z.string().min(1, "Dosage form name is required").max(100),
  nameAr: z.string().max(100).optional(),
  nameFr: z.string().max(100).optional(),
  nameIt: z.string().max(100).optional(),
  description: z.string().max(255).optional(),
});

export const CreateUnitSchema = z.object({
  name: z.string().min(1, "Unit name is required").max(50),
  nameAr: z.string().max(50).optional(),
  nameFr: z.string().max(50).optional(),
  nameIt: z.string().max(50).optional(),
  abbreviation: z.string().max(20).optional(),
  description: z.string().max(255).optional(),
});

export const CreateMedicineSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(100),
  barcode: z.string().max(100).optional(),
  name: z.string().min(1, "Medicine name is required").max(191),
  nameAr: z.string().max(191).optional(),
  nameFr: z.string().max(191).optional(),
  nameIt: z.string().max(191).optional(),
  genericId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  manufacturerId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  dosageFormId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  strength: z.string().max(50).optional(),
  reorderLevel: z.number().int().min(0).default(10),
  isPrescriptionRequired: z.boolean().default(false),
  isNarcotic: z.boolean().default(false),
});

export const UpdateMedicineSchema = CreateMedicineSchema.partial();

export const CreateBatchSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine ID"),
  batchNumber: z.string().min(1, "Batch number is required").max(100),
  mfgDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date(),
  purchasePrice: z.number().positive("Purchase price must be positive"),
  sellingPrice: z.number().positive("Selling price must be positive"),
  mrp: z.number().positive().optional(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateManufacturerInput = z.infer<typeof CreateManufacturerSchema>;
export type CreateGenericInput = z.infer<typeof CreateGenericSchema>;
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
export type CreateDosageFormInput = z.infer<typeof CreateDosageFormSchema>;
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
export type CreateMedicineInput = z.infer<typeof CreateMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof UpdateMedicineSchema>;
export type CreateBatchInput = z.infer<typeof CreateBatchSchema>;
