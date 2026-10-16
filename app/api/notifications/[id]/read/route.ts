import { NextResponse } from "next/server";
import { NotificationService } from "@/services/notification.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export const PATCH = withPermission(
  PERMISSIONS.NOTIFICATION_VIEW,
  async (_request: Request, context, routeContext?: { params: Promise<{ id: string }> }) => {
    try {
      const params = await routeContext?.params;
      const notificationId = params?.id;

      if (!notificationId) {
        return NextResponse.json(createErrorResponse("Notification ID is required").body, { status: 400 });
      }

      const service = new NotificationService(context.tenantId);
      const updated = await service.markAsRead(notificationId, context.userId);

      if (!updated) {
        return NextResponse.json(createErrorResponse("Notification not found or access denied").body, {
          status: 404,
        });
      }

      return NextResponse.json(createSuccessResponse(updated));
    } catch (error) {
      const { statusCode, body } = createErrorResponse(error);
      return NextResponse.json(body, { status: statusCode });
    }
  }
);
