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

    const authContext = await requirePermission(PERMISSIONS.STAFF_VIEW, {
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const iamService = new IamService(authContext.tenantId);
    const staff = await iamService.listStaff(authContext.userId);

    return NextResponse.json(createSuccessResponse(staff));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const authContext = await requirePermission(PERMISSIONS.STAFF_MANAGE, {
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const body = await request.json();
    const iamService = new IamService(authContext.tenantId);
    const newStaff = await iamService.createStaff(authContext.userId, body);

    return NextResponse.json(createSuccessResponse(newStaff), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const authContext = await requirePermission(PERMISSIONS.STAFF_MANAGE, {
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const body = await request.json();
    const iamService = new IamService(authContext.tenantId);
    const updatedStaff = await iamService.toggleStaffStatus(authContext.userId, body);

    return NextResponse.json(createSuccessResponse(updatedStaff));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
