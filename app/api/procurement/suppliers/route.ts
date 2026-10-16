import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { ProcurementService } from "@/services/procurement.service";
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

    const procurementService = new ProcurementService(context.tenantId);
    const suppliers = await procurementService.listSuppliers();

    return NextResponse.json(createSuccessResponse(suppliers));
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
    const procurementService = new ProcurementService(context.tenantId);
    const supplier = await procurementService.createSupplier(context.userId, payload);

    return NextResponse.json(createSuccessResponse(supplier), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
