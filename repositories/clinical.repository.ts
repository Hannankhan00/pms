import { tenantDb } from "../lib/tenant/tenant-db";
import {
  CreateCustomerInput,
  CreatePatientInput,
  CreateDoctorInput,
  CreatePrescriptionInput,
} from "../validations/clinical.schema";
import { Customer, Patient, Doctor, Prescription, PrescriptionStatus, Prisma } from "@prisma/client";

export class ClinicalRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // ============================================================================
  // CUSTOMER REPOSITORY (Financial Billing Entity)
  // ============================================================================

  async createCustomer(data: CreateCustomerInput, createdBy?: string): Promise<Customer> {
    return this.db.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        creditLimit: new Prisma.Decimal(data.creditLimit.toString()),
        currentBalance: new Prisma.Decimal(data.currentBalance.toString()),
        isActive: data.isActive ?? true,
        createdBy,
      },
    });
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
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        patients: {
          where: { isDeleted: false },
          select: { id: true, name: true, bloodGroup: true },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  async findCustomerById(id: string): Promise<Customer | null> {
    return this.db.customer.findFirst({
      where: { id, isDeleted: false },
      include: {
        patients: {
          where: { isDeleted: false },
        },
        sales: {
          where: { isDeleted: false },
          orderBy: { saleDate: "desc" },
          take: 10,
        },
      },
    });
  }

  // ============================================================================
  // PATIENT REPOSITORY (Clinical Entity)
  // ============================================================================

  async createPatient(data: CreatePatientInput, createdBy?: string): Promise<Patient> {
    return this.db.patient.create({
      data: {
        customerId: data.customerId && data.customerId.trim() !== "" ? data.customerId : null,
        name: data.name,
        dob: data.dob,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        medicalHistory: data.medicalHistory,
        createdBy,
      },
      include: { customer: true },
    });
  }

  async findPatients(search?: string): Promise<Patient[]> {
    return this.db.patient.findMany({
      where: {
        isDeleted: false,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { allergies: { contains: search } },
                { customer: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        prescriptions: {
          where: { isDeleted: false },
          select: { id: true, status: true, prescriptionNumber: true },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  async findPatientById(id: string) {
    return this.db.patient.findFirst({
      where: { id, isDeleted: false },
      include: {
        customer: true,
        prescriptions: {
          where: { isDeleted: false },
          include: {
            doctor: true,
            verifiedBy: {
              select: { id: true, name: true, email: true },
            },
            items: {
              include: {
                medicine: {
                  select: { id: true, name: true, strength: true, isPrescriptionRequired: true, generic: { select: { name: true } } },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // ============================================================================
  // DOCTOR REPOSITORY (Prescribers Registry)
  // ============================================================================

  async createDoctor(data: CreateDoctorInput, createdBy?: string): Promise<Doctor> {
    return this.db.doctor.create({
      data: {
        name: data.name,
        specialization: data.specialization,
        licenseNumber: data.licenseNumber,
        hospitalAffiliation: data.hospitalAffiliation,
        phone: data.phone,
        email: data.email || null,
        createdBy,
      },
    });
  }

  async findDoctors(search?: string): Promise<Doctor[]> {
    return this.db.doctor.findMany({
      where: {
        isDeleted: false,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { specialization: { contains: search } },
                { licenseNumber: { contains: search } },
                { hospitalAffiliation: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { prescriptions: true },
        },
      },
      orderBy: { name: "asc" },
      take: 50,
    });
  }

  async findDoctorById(id: string): Promise<Doctor | null> {
    return this.db.doctor.findFirst({
      where: { id, isDeleted: false },
      include: {
        prescriptions: {
          where: { isDeleted: false },
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // ============================================================================
  // PRESCRIPTION REPOSITORY (Clinical Workflow)
  // ============================================================================

  async createPrescription(data: CreatePrescriptionInput, createdBy?: string): Promise<Prescription> {
    const rxNumber =
      data.prescriptionNumber ||
      `RX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    return this.db.prescription.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId && data.doctorId.trim() !== "" ? data.doctorId : null,
        prescriptionNumber: rxNumber,
        prescriptionDate: data.prescriptionDate ?? new Date(),
        status: PrescriptionStatus.PENDING,
        notes: data.notes,
        createdBy,
        items: {
          create: data.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            quantityRequired: item.quantityRequired,
            quantity: item.quantity,
            instructions: item.instructions,
          })),
        },
      },
      include: {
        patient: {
          include: { customer: true },
        },
        doctor: true,
        items: { include: { medicine: true } },
      },
    });
  }

  async findPrescriptions(params?: {
    status?: PrescriptionStatus;
    patientId?: string;
    search?: string;
  }) {
    return this.db.prescription.findMany({
      where: {
        isDeleted: false,
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.patientId ? { patientId: params.patientId } : {}),
        ...(params?.search
          ? {
              OR: [
                { prescriptionNumber: { contains: params.search } },
                { patient: { name: { contains: params.search } } },
                { doctor: { name: { contains: params.search } } },
              ],
            }
          : {}),
      },
      include: {
        patient: {
          include: { customer: true },
        },
        doctor: true,
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        sale: {
          select: { id: true, receiptNumber: true, totalAmount: true, saleDate: true },
        },
        items: {
          include: {
            medicine: {
              select: { id: true, name: true, strength: true, isPrescriptionRequired: true, generic: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async findPrescriptionById(id: string) {
    return this.db.prescription.findFirst({
      where: { id, isDeleted: false },
      include: {
        patient: {
          include: { customer: true },
        },
        doctor: true,
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        sale: {
          select: { id: true, receiptNumber: true, totalAmount: true, saleDate: true },
        },
        items: {
          include: {
            medicine: {
              select: { id: true, name: true, strength: true, isPrescriptionRequired: true, generic: { select: { name: true } } },
            },
          },
        },
      },
    });
  }

  async verifyPrescription(
    id: string,
    verifiedById: string,
    status: PrescriptionStatus = PrescriptionStatus.VERIFIED,
    notes?: string
  ): Promise<Prescription> {
    return this.db.prescription.update({
      where: { id },
      data: {
        status,
        verifiedById,
        verifiedAt: new Date(),
        updatedBy: verifiedById,
        ...(notes ? { notes } : {}),
      },
      include: {
        patient: true,
        doctor: true,
        verifiedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: { medicine: true },
        },
      },
    });
  }

  async dispensePrescription(id: string, saleId: string, updatedBy?: string): Promise<Prescription> {
    return this.db.prescription.update({
      where: { id },
      data: {
        status: PrescriptionStatus.DISPENSED,
        saleId,
        updatedBy,
      },
    });
  }
}
