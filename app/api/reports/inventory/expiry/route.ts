import { NextRequest, NextResponse } from "next/server";
import { ReportsService } from "@/services/reports.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { InventoryExpiryQuerySchema } from "@/validations/reports.schema";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.REPORTS_VIEW, async (request: Request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = InventoryExpiryQuerySchema.parse({
      branchId: searchParams.get("branchId") ?? undefined,
      days: searchParams.get("days") ?? 90,
    });

    const reportsService = new ReportsService(context.tenantId);
    const data = await reportsService.getInventoryExpiry(query);

    return NextResponse.json(createSuccessResponse(data));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
