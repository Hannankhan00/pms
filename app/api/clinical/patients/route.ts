import { NextRequest, NextResponse } from "next/server";
import { ClinicalService } from "@/services/clinical.service";
import { getTenantContext } from "@/lib/tenant/context";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";

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
    const search = searchParams.get("search") ?? undefined;

    const clinicalService = new ClinicalService(context.tenantId);
    const patients = await clinicalService.listPatients(search);

    return NextResponse.json(createSuccessResponse(patients));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export const POST = withPermission(
  PERMISSIONS.PATIENT_CREATE,
  async (request: Request, context: { tenantId: string; userId: string }) => {
    const body = await request.json();
    const clinicalService = new ClinicalService(context.tenantId);
    const patient = await clinicalService.createPatient(context.userId, body);

    return NextResponse.json(createSuccessResponse(patient), { status: 201 });
  }
);
