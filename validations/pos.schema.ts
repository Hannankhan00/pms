import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(191),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(255).optional(),
});

export const CreatePatientSchema = z.object({
  customerId: z.string().uuid().optional(),
  name: z.string().min(1, "Patient name is required").max(191),
  dob: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodGroup: z.string().max(10).optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
});

export const SaleItemInputSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine ID"),
  batchId: z.string().uuid("Invalid batch ID"),
  quantity: z.number().int().positive("Sale quantity must be at least 1"),
  unitPrice: z.number().positive("Unit price must be positive"),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
});

export const PaymentInputSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive("Payment amount must be positive"),
  referenceNumber: z.string().max(100).optional(),
});

export const CreateSaleSchema = z.object({
  branchId: z.string().uuid("Invalid branch ID"),
  customerId: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
  items: z.array(SaleItemInputSchema).min(1, "At least one item must be in the sale"),
  payments: z.array(PaymentInputSchema).min(1, "At least one payment method is required"),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  notes: z.string().max(255).optional(),
});

export const PrescriptionItemInputSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine ID"),
  dosage: z.string().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Frequency is required").max(100),
  duration: z.string().min(1, "Duration is required").max(100),
  quantity: z.number().int().positive("Prescribed quantity must be positive"),
  instructions: z.string().max(255).optional(),
});

export const CreatePrescriptionSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  doctorId: z.string().uuid().optional(),
  prescriptionNumber: z.string().max(100).optional(),
  prescriptionDate: z.coerce.date().default(() => new Date()),
  notes: z.string().max(255).optional(),
  items: z.array(PrescriptionItemInputSchema).min(1, "At least one prescribed item is required"),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;
export type PaymentInput = z.infer<typeof PaymentInputSchema>;
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
