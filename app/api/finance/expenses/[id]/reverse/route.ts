import { NextResponse } from "next/server";
import { FinanceService } from "@/services/finance.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { ReverseExpenseSchema } from "@/validations/finance.schema";

export const dynamic = "force-dynamic";

export const POST = withPermission(
  PERMISSIONS.FINANCE_MANAGE,
  async (
    request: Request,
    context: { tenantId: string; userId: string },
    routeContext?: { params: Promise<{ id: string }> | { id: string } }
  ) => {
    try {
      const resolvedParams = routeContext?.params ? await Promise.resolve(routeContext.params) : undefined;
      const expenseId = resolvedParams?.id;

      if (!expenseId) {
        return NextResponse.json({ success: false, error: "Expense ID is required" }, { status: 400 });
      }

      const body = await request.json();
      const validated = ReverseExpenseSchema.parse(body);

      const financeService = new FinanceService(context.tenantId);
      const reversed = await financeService.reverseExpense(context.userId, expenseId, validated.reason);

      return NextResponse.json(createSuccessResponse(reversed));
    } catch (error) {
      const { statusCode, body } = createErrorResponse(error);
      return NextResponse.json(body, { status: statusCode });
    }
  }
);
