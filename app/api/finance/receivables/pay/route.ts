import { NextResponse } from "next/server";
import { FinanceService } from "@/services/finance.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";
import { RecordCustomerPaymentSchema } from "@/validations/finance.schema";

export const dynamic = "force-dynamic";

export const POST = withPermission(
  PERMISSIONS.FINANCE_MANAGE,
  async (request: Request, context: { tenantId: string; userId: string }) => {
    try {
      const body = await request.json();
      const validated = RecordCustomerPaymentSchema.parse(body);

      const financeService = new FinanceService(context.tenantId);
      const result = await financeService.receiveCustomerPayment(context.userId, validated);

      return NextResponse.json(createSuccessResponse(result), { status: 201 });
    } catch (error) {
      const { statusCode, body } = createErrorResponse(error);
      return NextResponse.json(body, { status: statusCode });
    }
  }
);
