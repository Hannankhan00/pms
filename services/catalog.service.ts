import { CatalogRepository } from "../repositories/catalog.repository";
import {
  CreateMedicineSchema,
  CreateMedicineInput,
  UpdateMedicineSchema,
  UpdateMedicineInput,
  CreateBatchSchema,
  CreateBatchInput,
  CreateCategorySchema,
  CreateBrandSchema,
  CreateGenericSchema,
  CreateDosageFormSchema,
  CreateUnitSchema,
} from "../validations/medicine.schema";
import { ConflictError, NotFoundError, ValidationError } from "../lib/errors/app-error";
import { requirePermission } from "../lib/permissions/permission-service";
import { PERMISSIONS } from "../lib/permissions/permission-service";

export class CatalogService {
  private readonly repository: CatalogRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new CatalogRepository(tenantId);
  }

  // --- Taxonomy Management ---
  async createCategory(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_CREATE);
    const parsed = CreateCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid category input", parsed.error.format());
    }
    return this.repository.createCategory(parsed.data);
  }

  async listCategories() {
    return this.repository.findCategories();
  }

  async createGeneric(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_CREATE);
    const parsed = CreateGenericSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid generic input", parsed.error.format());
    }
    return this.repository.createGeneric(parsed.data);
  }

  async listGenerics() {
    return this.repository.findGenerics();
  }

  async createBrand(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_CREATE);
    const parsed = CreateBrandSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid brand input", parsed.error.format());
    }
    return this.repository.createBrand(parsed.data);
  }

  async listBrands() {
    return this.repository.findBrands();
  }

  async createDosageForm(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_CREATE);
    const parsed = CreateDosageFormSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid dosage form input", parsed.error.format());
    }
    return this.repository.createDosageForm(parsed.data);
  }

  async listDosageForms() {
    return this.repository.findDosageForms();
  }

  async createUnit(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_CREATE);
    const parsed = CreateUnitSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid unit input", parsed.error.format());
    }
    return this.repository.createUnit(parsed.data);
  }

  async listUnits() {
    return this.repository.findUnits();
  }

  // --- Medicine Management ---
  async createMedicine(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_CREATE);

    const parsed = CreateMedicineSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid medicine input", parsed.error.format());
    }

    const existingSku = await this.repository.findMedicineBySku(parsed.data.sku);
    if (existingSku) {
      throw new ConflictError(`Medicine SKU '${parsed.data.sku}' already exists in this pharmacy`);
    }

    return this.repository.createMedicine(parsed.data);
  }

  async getMedicine(id: string) {
    const med = await this.repository.findMedicineById(id);
    if (!med) {
      throw new NotFoundError("Medicine", id);
    }
    return med;
  }

  async findByBarcode(barcode: string) {
    const med = await this.repository.findMedicineByBarcode(barcode);
    if (!med) {
      throw new NotFoundError("Medicine with barcode", barcode);
    }
    return med;
  }

  async listMedicines(params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.repository.findMedicines(params);
  }

  async updateMedicine(userId: string, id: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_UPDATE);
    const parsed = UpdateMedicineSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid medicine update input", parsed.error.format());
    }

    const existing = await this.repository.findMedicineById(id);
    if (!existing) {
      throw new NotFoundError("Medicine", id);
    }

    return this.repository.updateMedicine(id, parsed.data);
  }

  async deleteMedicine(userId: string, id: string) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.MEDICINE_DELETE);
    const existing = await this.repository.findMedicineById(id);
    if (!existing) {
      throw new NotFoundError("Medicine", id);
    }

    return this.repository.softDeleteMedicine(id);
  }

  // --- Batch Management ---
  async createBatch(userId: string, input: unknown) {
    await requirePermission(userId, this.tenantId, PERMISSIONS.INVENTORY_MANAGE);
    const parsed = CreateBatchSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError("Invalid batch input", parsed.error.format());
    }

    const medicine = await this.repository.findMedicineById(parsed.data.medicineId);
    if (!medicine) {
      throw new NotFoundError("Medicine", parsed.data.medicineId);
    }

    return this.repository.createBatch(parsed.data);
  }

  async listBatchesByMedicine(medicineId: string) {
    return this.repository.findBatchesByMedicine(medicineId);
  }
}
