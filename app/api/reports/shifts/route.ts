import { NextRequest, NextResponse } from "next/server";
import { ReportsService } from "@/services/reports.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { ShiftReportQuerySchema } from "@/validations/reports.schema";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.REPORTS_VIEW, async (request: Request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = ShiftReportQuerySchema.parse({
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      cashierId: searchParams.get("cashierId") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      shiftId: searchParams.get("shiftId") ?? undefined,
      hasDiscrepancy: (searchParams.get("hasDiscrepancy") as any) ?? undefined,
    });

    const reportsService = new ReportsService(context.tenantId);
    const data = await reportsService.getShiftReconciliation(query);

    return NextResponse.json(createSuccessResponse(data));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
