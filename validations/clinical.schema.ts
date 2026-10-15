import { z } from "zod";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(191),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(255).optional(),
  creditLimit: z.number().min(0).default(0),
  currentBalance: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const CreatePatientSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID").optional().or(z.literal("")),
  name: z.string().min(1, "Patient name is required").max(191),
  dob: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  bloodGroup: z.string().max(10).optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
});

export const CreateDoctorSchema = z.object({
  name: z.string().min(1, "Doctor name is required").max(191),
  specialization: z.string().min(1, "Specialization is required").max(150),
  licenseNumber: z.string().min(1, "License number is required").max(100),
  hospitalAffiliation: z.string().max(191).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export const PrescriptionItemInputSchema = z.object({
  medicineId: z.string().uuid("Invalid medicine ID"),
  dosage: z.string().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Frequency is required").max(100),
  duration: z.string().min(1, "Duration is required").max(100),
  quantityRequired: z.number().int().positive("Prescribed quantity required must be positive").optional(),
  quantity: z.number().int().positive("Prescribed quantity must be positive").optional(),
  instructions: z.string().max(255).optional(),
}).transform((item) => ({
  ...item,
  quantityRequired: item.quantityRequired ?? item.quantity ?? 1,
  quantity: item.quantity ?? item.quantityRequired ?? 1,
}));

export const CreatePrescriptionSchema = z.object({
  patientId: z.string().uuid("Invalid patient ID"),
  doctorId: z.string().uuid("Invalid doctor ID").optional().or(z.literal("")),
  prescriptionNumber: z.string().max(100).optional(),
  prescriptionDate: z.coerce.date().default(() => new Date()),
  notes: z.string().max(255).optional(),
  items: z.array(PrescriptionItemInputSchema).min(1, "At least one medication item is required"),
});

export const VerifyPrescriptionSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]).default("VERIFIED"),
  notes: z.string().max(255).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;
export type PrescriptionItemInput = z.infer<typeof PrescriptionItemInputSchema>;
export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type VerifyPrescriptionInput = z.infer<typeof VerifyPrescriptionSchema>;
