import { tenantDb } from "../lib/tenant/tenant-db";
import {
  CreateCustomerInput,
  CreatePatientInput,
  CreatePrescriptionInput,
} from "../validations/pos.schema";
import { Customer, Patient, Doctor, Prescription, Prisma } from "@prisma/client";

export class ClinicalRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // --- Customer ---
  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    return this.db.customer.create({ data });
  }

  async findCustomers(search?: string): Promise<Customer[]> {
    return this.db.customer.findMany({
      where: {
        isDeleted: false,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  // --- Patient ---
  async createPatient(data: CreatePatientInput): Promise<Patient> {
    return this.db.patient.create({ data });
  }

  async findPatients(search?: string): Promise<Patient[]> {
    return this.db.patient.findMany({
      where: {
        isDeleted: false,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
              ],
            }
          : {}),
      },
      include: { customer: true },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  // --- Doctor ---
  async findDoctors(): Promise<Doctor[]> {
    return this.db.doctor.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  // --- Prescription ---
  async createPrescription(data: CreatePrescriptionInput, createdBy?: string): Promise<Prescription> {
    const rxNumber =
      data.prescriptionNumber ||
      `RX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return this.db.prescription.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        prescriptionNumber: rxNumber,
        prescriptionDate: data.prescriptionDate,
        notes: data.notes,
        createdBy,
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantity: item.quantity,
            instructions: item.instructions,
          })),
        },
      },
      include: {
        patient: true,
        doctor: true,
        items: { include: { medicine: true } },
      },
    });
  }

  async findPrescriptionById(id: string) {
    return this.db.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        items: { include: { medicine: true } },
      },
    });
  }
}
