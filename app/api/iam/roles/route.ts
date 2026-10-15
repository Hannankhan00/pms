import { NextRequest, NextResponse } from "next/server";
import { IamService } from "@/services/iam.service";
import { getTenantContext } from "@/lib/tenant/context";
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
    const roles = await iamService.listRoles(authContext.userId);

    return NextResponse.json(createSuccessResponse(roles));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const authContext = await requirePermission(PERMISSIONS.ROLES_MANAGE, {
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const body = await request.json();
    const iamService = new IamService(authContext.tenantId);
    const newRole = await iamService.createRole(authContext.userId, body);

    return NextResponse.json(createSuccessResponse(newRole), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
