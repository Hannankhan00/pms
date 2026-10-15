import { NextRequest, NextResponse } from "next/server";
import { ShiftService } from "@/services/shift.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { requirePermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const authContext = await requirePermission(PERMISSIONS.SHIFT_MANAGE, {
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const body = await request.json();
    const shiftService = new ShiftService(authContext.tenantId);
    const tx = await shiftService.recordShiftTransaction(authContext.userId, body);

    return NextResponse.json(createSuccessResponse(tx), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
