import { z } from "zod";
import { AuditAction, LicenseType, LicenseStatus } from "@prisma/client";

export const AuditLogFilterSchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditLogFilterInput = z.infer<typeof AuditLogFilterSchema>;

export const PharmacyLicenseSchema = z.object({
  licenseType: z.nativeEnum(LicenseType),
  licenseNumber: z.string().min(1, "License number is required").max(100),
  issueDate: z.coerce.date({ message: "Issue date is required" }),
  expiryDate: z.coerce.date({ message: "Expiry date is required" }),
  status: z.nativeEnum(LicenseStatus).default(LicenseStatus.ACTIVE),
  documentUrl: z.string().url("Must be a valid document URL").or(z.string().max(255)).optional().nullable(),
});

export type PharmacyLicenseInput = z.infer<typeof PharmacyLicenseSchema>;

export const ControlledSubstanceFilterSchema = z.object({
  medicineId: z.string().optional(),
  branchId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ControlledSubstanceFilterInput = z.infer<typeof ControlledSubstanceFilterSchema>;
