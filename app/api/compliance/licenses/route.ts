import { NextResponse } from "next/server";
import { ComplianceService } from "@/services/compliance.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { PharmacyLicenseSchema } from "@/validations/compliance.schema";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.AUDIT_VIEW, async (_request: Request, context) => {
  try {
    const complianceService = new ComplianceService(context.tenantId);
    const data = await complianceService.listLicenses();

    return NextResponse.json(createSuccessResponse(data));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});

export const POST = withPermission(PERMISSIONS.COMPLIANCE_MANAGE, async (request: Request, context) => {
  try {
    const body = await request.json();
    const validated = PharmacyLicenseSchema.parse(body);

    const complianceService = new ComplianceService(context.tenantId);
    const data = await complianceService.createLicense(context.userId, validated);

    return NextResponse.json(createSuccessResponse(data), { status: 201 });
  } catch (error) {
    const { statusCode, body: errorBody } = createErrorResponse(error);
    return NextResponse.json(errorBody, { status: statusCode });
  }
});
