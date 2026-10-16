import { NextResponse } from "next/server";
import { tenantDb } from "@/lib/tenant/tenant-db";
import { exportToCsv, createCsvResponse } from "@/lib/utils/csv-exporter";
import { createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.REPORTS_VIEW, async (request: Request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity")?.toLowerCase();
    const db = tenantDb(context.tenantId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    switch (entity) {
      case "medicines": {
        const medicines = await db.medicine.findMany({
          include: { category: { select: { name: true } } },
          orderBy: { name: "asc" },
        });

        const data = medicines.map((m: any) => ({
          sku: m.sku,
          name: m.name,
          category: m.category?.name ?? "",
          strength: m.strength ?? "",
          minStockLevel: m.minStockLevel,
          maxStockLevel: m.maxStockLevel,
          reorderLevel: m.reorderLevel,
          isControlled: m.isControlled,
          regulatorySchedule: m.regulatorySchedule ?? "",
          isNarcotic: m.isNarcotic,
          isPrescriptionRequired: m.isPrescriptionRequired,
          createdAt: m.createdAt,
        }));

        const csv = exportToCsv(data);
        return createCsvResponse(csv, `medicines_export_${timestamp}.csv`);
      }

      case "suppliers": {
        const suppliers = await db.supplier.findMany({
          orderBy: { name: "asc" },
        });

        const data = suppliers.map((s: any) => ({
          name: s.name,
          contactPerson: s.contactPerson ?? "",
          email: s.email ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          taxNumber: s.taxNumber ?? "",
          createdAt: s.createdAt,
        }));

        const csv = exportToCsv(data);
        return createCsvResponse(csv, `suppliers_export_${timestamp}.csv`);
      }

      case "customers": {
        const customers = await db.customer.findMany({
          orderBy: { name: "asc" },
        });

        const data = customers.map((c: any) => ({
          name: c.name,
          phone: c.phone ?? "",
          email: c.email ?? "",
          address: c.address ?? "",
          creditLimit: Number(c.creditLimit),
          createdAt: c.createdAt,
        }));

        const csv = exportToCsv(data);
        return createCsvResponse(csv, `customers_export_${timestamp}.csv`);
      }

      case "inventory": {
        const batches = await db.medicineBatch.findMany({
          where: { isArchived: false },
          include: {
            medicine: { select: { name: true, sku: true } },
            branch: { select: { name: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
        });

        const data = batches.map((b: any) => ({
          branch: b.branch?.name ?? "",
          sku: b.medicine?.sku ?? "",
          medicine: b.medicine?.name ?? "",
          batchNumber: b.batchNumber,
          quantity: b.quantity,
          purchasePrice: Number(b.purchasePrice),
          sellingPrice: Number(b.sellingPrice),
          expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split("T")[0] : "",
        }));

        const csv = exportToCsv(data);
        return createCsvResponse(csv, `inventory_export_${timestamp}.csv`);
      }

      default: {
        const err = createErrorResponse("Invalid export entity. Supported: medicines, suppliers, customers, inventory");
        return NextResponse.json(err.body, { status: 400 });
      }
    }
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
