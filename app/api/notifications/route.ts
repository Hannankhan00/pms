import { NextResponse } from "next/server";
import { NotificationService } from "@/services/notification.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { NotificationFilterSchema } from "@/validations/notification.schema";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.NOTIFICATION_VIEW, async (request: Request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = NotificationFilterSchema.safeParse({
      isRead: searchParams.get("isRead") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? "Invalid notification filters";
      return NextResponse.json(createErrorResponse(msg).body, { status: 400 });
    }

    const service = new NotificationService(context.tenantId);
    const result = await service.listNotifications(context.userId, parsed.data);

    return NextResponse.json(createSuccessResponse(result));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
