import { NextRequest, NextResponse } from "next/server";
import { ClinicalService } from "@/services/clinical.service";
import { getTenantContext } from "@/lib/tenant/context";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const clinicalService = new ClinicalService(context.tenantId);
    const prescription = await clinicalService.getPrescription(id);

    return NextResponse.json(createSuccessResponse(prescription));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
