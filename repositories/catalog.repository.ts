import { tenantDb } from "../lib/tenant/tenant-db";
import {
  CreateMedicineInput,
  UpdateMedicineInput,
  CreateBatchInput,
  CreateCategoryInput,
  CreateGenericInput,
  CreateBrandInput,
  CreateDosageFormInput,
  CreateUnitInput,
} from "../validations/medicine.schema";
import {
  Medicine,
  MedicineBatch,
  Category,
  Generic,
  Brand,
  DosageForm,
  Unit,
} from "@prisma/client";

export class CatalogRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // --- Category ---
  async createCategory(data: CreateCategoryInput): Promise<Category> {
    return this.db.category.create({ data });
  }

  async findCategories(): Promise<Category[]> {
    return this.db.category.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  // --- Generic ---
  async createGeneric(data: CreateGenericInput): Promise<Generic> {
    return this.db.generic.create({ data });
  }

  async findGenerics(): Promise<Generic[]> {
    return this.db.generic.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  // --- Brand ---
  async createBrand(data: CreateBrandInput): Promise<Brand> {
    return this.db.brand.create({ data });
  }

  async findBrands(): Promise<Brand[]> {
    return this.db.brand.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  // --- Dosage Form ---
  async createDosageForm(data: CreateDosageFormInput): Promise<DosageForm> {
    return this.db.dosageForm.create({ data });
  }

  async findDosageForms(): Promise<DosageForm[]> {
    return this.db.dosageForm.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  // --- Unit ---
  async createUnit(data: CreateUnitInput): Promise<Unit> {
    return this.db.unit.create({ data });
  }

  async findUnits(): Promise<Unit[]> {
    return this.db.unit.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  // --- Medicine ---
  async createMedicine(data: CreateMedicineInput): Promise<Medicine> {
    return this.db.medicine.create({
      data: {
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        nameAr: data.nameAr,
        nameFr: data.nameFr,
        nameIt: data.nameIt,
        genericId: data.genericId,
        brandId: data.brandId,
        manufacturerId: data.manufacturerId,
        categoryId: data.categoryId,
        dosageFormId: data.dosageFormId,
        unitId: data.unitId,
        strength: data.strength,
        reorderLevel: data.reorderLevel,
        isPrescriptionRequired: data.isPrescriptionRequired,
        isNarcotic: data.isNarcotic,
      },
      include: {
        category: true,
        generic: true,
        brand: true,
        dosageForm: true,
        unit: true,
      },
    });
  }

  async findMedicineById(id: string) {
    return this.db.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        generic: true,
        brand: true,
        dosageForm: true,
        unit: true,
        batches: {
          where: { isDeleted: false },
          orderBy: { expiryDate: "asc" },
        },
      },
    });
  }

  async findMedicineBySku(sku: string): Promise<Medicine | null> {
    return this.db.medicine.findFirst({
      where: { sku, isDeleted: false },
    });
  }

  async findMedicineByBarcode(barcode: string): Promise<Medicine | null> {
    return this.db.medicine.findFirst({
      where: { barcode, isDeleted: false },
      include: {
        batches: {
          where: { isDeleted: false },
          orderBy: { expiryDate: "asc" },
        },
      },
    });
  }

  async findMedicines(params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (params?.categoryId) {
      where.categoryId = params.categoryId;
    }
    if (params?.brandId) {
      where.brandId = params.brandId;
    }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search } },
        { nameAr: { contains: params.search } },
        { sku: { contains: params.search } },
        { barcode: { contains: params.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.db.medicine.findMany({
        where,
        include: {
          category: true,
          brand: true,
          generic: true,
          dosageForm: true,
          unit: true,
          batches: {
            where: { isDeleted: false },
            orderBy: { expiryDate: "asc" },
          },
        },
        orderBy: { name: "asc" },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      this.db.medicine.count({ where }),
    ]);

    return { items, total };
  }

  async updateMedicine(id: string, data: UpdateMedicineInput): Promise<Medicine> {
    return this.db.medicine.update({
      where: { id },
      data,
    });
  }

  async softDeleteMedicine(id: string): Promise<Medicine> {
    return this.db.medicine.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // --- Batches ---
  async createBatch(data: CreateBatchInput): Promise<MedicineBatch> {
    return this.db.medicineBatch.create({
      data: {
        medicineId: data.medicineId,
        batchNumber: data.batchNumber,
        mfgDate: data.mfgDate,
        expiryDate: data.expiryDate,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        mrp: data.mrp,
      },
    });
  }

  async findBatchesByMedicine(medicineId: string): Promise<MedicineBatch[]> {
    return this.db.medicineBatch.findMany({
      where: { medicineId, isDeleted: false },
      orderBy: { expiryDate: "asc" }, // FEFO order
    });
  }

  async findBatchById(id: string): Promise<MedicineBatch | null> {
    return this.db.medicineBatch.findUnique({
      where: { id },
      include: { medicine: true },
    });
  }
}
