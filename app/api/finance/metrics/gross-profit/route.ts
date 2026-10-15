import { NextRequest, NextResponse } from "next/server";
import { MetricsService } from "@/services/metrics.service";
import { getTenantContext } from "@/lib/tenant/context";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { GrossProfitQuerySchema } from "@/validations/finance.schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const searchParams = request.nextUrl.searchParams;
    const query = {
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
    };

    const validated = GrossProfitQuerySchema.parse(query);

    const metricsService = new MetricsService(context.tenantId);
    const report = await metricsService.calculateGrossProfit(validated);

    return NextResponse.json(createSuccessResponse(report));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
