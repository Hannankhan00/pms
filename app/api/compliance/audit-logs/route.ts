import { NextResponse } from "next/server";
import { ComplianceService } from "@/services/compliance.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { AuditLogFilterSchema } from "@/validations/compliance.schema";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.AUDIT_VIEW, async (request: Request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = AuditLogFilterSchema.parse({
      entity: searchParams.get("entity") ?? undefined,
      entityId: searchParams.get("entityId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const complianceService = new ComplianceService(context.tenantId);
    const data = await complianceService.listAuditLogs(query);

    return NextResponse.json(createSuccessResponse(data));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
