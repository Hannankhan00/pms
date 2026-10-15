import { NextRequest, NextResponse } from "next/server";
import { IamService } from "@/services/iam.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const authContext = await requirePermission(PERMISSIONS.ROLES_VIEW, {
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const iamService = new IamService(authContext.tenantId);
    const permissions = await iamService.listPermissions(authContext.userId);

    return NextResponse.json(createSuccessResponse(permissions));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
