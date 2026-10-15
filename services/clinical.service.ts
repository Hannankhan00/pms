import { ClinicalRepository } from "../repositories/clinical.repository";
import {
  CreateCustomerSchema,
  CreatePatientSchema,
  CreateDoctorSchema,
  CreatePrescriptionSchema,
  VerifyPrescriptionSchema,
} from "../validations/clinical.schema";
import { ValidationError, NotFoundError, BusinessRuleError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";
import { PrescriptionStatus } from "@prisma/client";

export class ClinicalService {
  private readonly repository: ClinicalRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new ClinicalRepository(tenantId);
  }

  // ============================================================================
  // CUSTOMER DOMAIN (Financial Transactions & Credit)
  // ============================================================================

  async createCustomer(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SALES_CREATE);
    const parsed = CreateCustomerSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid customer input", parsed.error.format());
    }
    return this.repository.createCustomer(parsed.data, userId);
  }

  async listCustomers(search?: string) {
    return this.repository.findCustomers(search);
  }

  async getCustomer(id: string) {
    const customer = await this.repository.findCustomerById(id);
    if (!customer) {
      throw new NotFoundError("Customer", id);
    }
    return customer;
  }

  // ============================================================================
  // PATIENT DOMAIN (Clinical Demographics, Allergies & Rx History)
  // ============================================================================

  async createPatient(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.PATIENT_CREATE);
    const parsed = CreatePatientSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid patient input", parsed.error.format());
    }
    return this.repository.createPatient(parsed.data, userId);
  }

  async listPatients(search?: string) {
    return this.repository.findPatients(search);
  }

  async getPatient(id: string) {
    const patient = await this.repository.findPatientById(id);
    if (!patient) {
      throw new NotFoundError("Patient", id);
    }
    return patient;
  }

  // ============================================================================
  // DOCTOR DOMAIN (Prescriber Registry)
  // ============================================================================

  async createDoctor(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.DOCTOR_CREATE);
    const parsed = CreateDoctorSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid doctor input", parsed.error.format());
    }
    return this.repository.createDoctor(parsed.data, userId);
  }

  async listDoctors(search?: string) {
    return this.repository.findDoctors(search);
  }

  async getDoctor(id: string) {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) {
      throw new NotFoundError("Doctor", id);
    }
    return doctor;
  }

  // ============================================================================
  // PRESCRIPTION WORKFLOW & VERIFICATION
  // ============================================================================

  async createPrescription(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.PRESCRIPTION_CREATE);
    const parsed = CreatePrescriptionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid prescription input", parsed.error.format());
    }
    return this.repository.createPrescription(parsed.data, userId);
  }

  async listPrescriptions(params?: {
    status?: PrescriptionStatus;
    patientId?: string;
    search?: string;
  }) {
    return this.repository.findPrescriptions(params);
  }

  async getPrescription(id: string) {
    const rx = await this.repository.findPrescriptionById(id);
    if (!rx) {
      throw new NotFoundError("Prescription", id);
    }
    return rx;
  }

  /**
   * Transition Prescription status to VERIFIED or REJECTED.
   * Gated strictly by PERMISSIONS.RX_VERIFY (Pharmacist role).
   */
  async verifyPrescription(userId: string, id: string, input?: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.RX_VERIFY);

    const rx = await this.repository.findPrescriptionById(id);
    if (!rx) {
      throw new NotFoundError("Prescription", id);
    }

    if (rx.status === PrescriptionStatus.DISPENSED) {
      throw new BusinessRuleError("Cannot alter an already dispensed prescription");
    }

    let targetStatus: PrescriptionStatus = PrescriptionStatus.VERIFIED;
    let notes: string | undefined = undefined;

    if (input) {
      const parsed = VerifyPrescriptionSchema.safeParse(input);
      if (!parsed.success) {
        throw new ValidationError("Invalid verification payload", parsed.error.format());
      }
      targetStatus = parsed.data.status as PrescriptionStatus;
      notes = parsed.data.notes;
    }

    return this.repository.verifyPrescription(id, userId, targetStatus, notes);
  }
}
