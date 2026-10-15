import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { InventoryService } from "@/services/inventory.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { InventoryTransactionType } from "@prisma/client";

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
    const branchId = searchParams.get("branchId") ?? undefined;
    const medicineId = searchParams.get("medicineId") ?? undefined;
    const batchId = searchParams.get("batchId") ?? undefined;
    const transactionType = (searchParams.get("transactionType") as InventoryTransactionType) ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const inventoryService = new InventoryService(context.tenantId);
    const entries = await inventoryService.listLedger({
      branchId,
      medicineId,
      batchId,
      transactionType,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json(createSuccessResponse(entries));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const payload = await request.json();
    const inventoryService = new InventoryService(context.tenantId);
    const adjustment = await inventoryService.adjustStock(context.userId, payload);

    return NextResponse.json(createSuccessResponse(adjustment), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
