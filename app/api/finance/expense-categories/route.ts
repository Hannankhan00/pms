import { NextRequest, NextResponse } from "next/server";
import { FinanceService } from "@/services/finance.service";
import { getTenantContext } from "@/lib/tenant/context";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { CreateExpenseCategorySchema } from "@/validations/finance.schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const financeService = new FinanceService(context.tenantId);
    const categories = await financeService.getExpenseCategories();

    return NextResponse.json(createSuccessResponse(categories));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export const POST = withPermission(
  PERMISSIONS.FINANCE_MANAGE,
  async (request: Request, context: { tenantId: string; userId: string }) => {
    const body = await request.json();
    const validated = CreateExpenseCategorySchema.parse(body);

    const financeService = new FinanceService(context.tenantId);
    const category = await financeService.createExpenseCategory(context.userId, validated);

    return NextResponse.json(createSuccessResponse(category), { status: 201 });
  }
);
