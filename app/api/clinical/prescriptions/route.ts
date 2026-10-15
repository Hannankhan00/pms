import { NextRequest, NextResponse } from "next/server";
import { ClinicalService } from "@/services/clinical.service";
import { getTenantContext } from "@/lib/tenant/context";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { PrescriptionStatus } from "@prisma/client";

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
    const statusParam = searchParams.get("status");
    const search = searchParams.get("search") ?? undefined;
    const patientId = searchParams.get("patientId") ?? undefined;

    let status: PrescriptionStatus | undefined = undefined;
    if (statusParam && Object.values(PrescriptionStatus).includes(statusParam as PrescriptionStatus)) {
      status = statusParam as PrescriptionStatus;
    }

    const clinicalService = new ClinicalService(context.tenantId);
    const prescriptions = await clinicalService.listPrescriptions({
      status,
      patientId,
      search,
    });

    return NextResponse.json(createSuccessResponse(prescriptions));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export const POST = withPermission(
  PERMISSIONS.PRESCRIPTION_CREATE,
  async (request: Request, context: { tenantId: string; userId: string }) => {
    const body = await request.json();
    const clinicalService = new ClinicalService(context.tenantId);
    const prescription = await clinicalService.createPrescription(context.userId, body);

    return NextResponse.json(createSuccessResponse(prescription), { status: 201 });
  }
);
