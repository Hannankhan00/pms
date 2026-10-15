import { NextRequest, NextResponse } from "next/server";
import { FinanceService } from "@/services/finance.service";
import { getTenantContext } from "@/lib/tenant/context";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { CreateExpenseSchema } from "@/validations/finance.schema";

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
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const branchId = searchParams.get("branchId") ?? undefined;
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined;

    const startDate = startDateParam ? new Date(`${startDateParam}T00:00:00.000Z`) : undefined;
    const endDate = endDateParam ? new Date(`${endDateParam}T23:59:59.999Z`) : undefined;

    const financeService = new FinanceService(context.tenantId);
    const expenses = await financeService.getExpenses({
      categoryId,
      branchId,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json(createSuccessResponse(expenses));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export const POST = withPermission(
  PERMISSIONS.FINANCE_MANAGE,
  async (request: Request, context: { tenantId: string; userId: string }) => {
    const body = await request.json();
    const validated = CreateExpenseSchema.parse(body);

    const financeService = new FinanceService(context.tenantId);
    const expense = await financeService.createExpense(context.userId, validated);

    return NextResponse.json(createSuccessResponse(expense), { status: 201 });
  }
);
