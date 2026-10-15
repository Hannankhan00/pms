import { ClinicalRepository } from "../repositories/clinical.repository";
import {
  CreateCustomerSchema,
  CreatePatientSchema,
  CreatePrescriptionSchema,
} from "../validations/pos.schema";
import { ValidationError, NotFoundError } from "../lib/errors/app-error";
import { requirePermission, PERMISSIONS } from "../lib/permissions/permission-service";

export class ClinicalService {
  private readonly repository: ClinicalRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new ClinicalRepository(tenantId);
  }

  // --- Customers ---
  async createCustomer(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SALES_CREATE);
    const parsed = CreateCustomerSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid customer input", parsed.error.format());
    }
    return this.repository.createCustomer(parsed.data);
  }

  async listCustomers(search?: string) {
    return this.repository.findCustomers(search);
  }

  // --- Patients ---
  async createPatient(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.SALES_CREATE);
    const parsed = CreatePatientSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid patient input", parsed.error.format());
    }
    return this.repository.createPatient(parsed.data);
  }

  async listPatients(search?: string) {
    return this.repository.findPatients(search);
  }

  // --- Doctors ---
  async listDoctors() {
    return this.repository.findDoctors();
  }

  // --- Prescriptions ---
  async createPrescription(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.PRESCRIPTION_CREATE);
    const parsed = CreatePrescriptionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid prescription input", parsed.error.format());
    }
    return this.repository.createPrescription(parsed.data, userId);
  }

  async getPrescription(id: string) {
    const rx = await this.repository.findPrescriptionById(id);
    if (!rx) {
      throw new NotFoundError("Prescription", id);
    }
    return rx;
  }
}
