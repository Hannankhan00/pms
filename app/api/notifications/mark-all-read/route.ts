import { NextResponse } from "next/server";
import { NotificationService } from "@/services/notification.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export const POST = withPermission(PERMISSIONS.NOTIFICATION_VIEW, async (_request: Request, context) => {
  try {
    const service = new NotificationService(context.tenantId);
    const result = await service.markAllAsRead(context.userId);

    return NextResponse.json(createSuccessResponse({ count: result.count }));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
