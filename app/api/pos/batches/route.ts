import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { InventoryService } from "@/services/inventory.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const searchParams = request.nextUrl.searchParams;
    const medicineId = searchParams.get("medicineId");
    const branchId = searchParams.get("branchId") ?? undefined;

    if (!medicineId) {
      return NextResponse.json(
        { success: false, error: { message: "medicineId query parameter is required" } },
        { status: 400 }
      );
    }

    const inventoryService = new InventoryService(context.tenantId);
    const batches = await inventoryService.getAvailableBatchesFEFO(medicineId, branchId);

    return NextResponse.json(createSuccessResponse(batches));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
