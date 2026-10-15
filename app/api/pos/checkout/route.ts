import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { PosService } from "@/services/pos.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const payload = await request.json();
    const posService = new PosService(context.tenantId);
    const sale = await posService.processSale(context.userId, payload);

    return NextResponse.json(createSuccessResponse(sale), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
