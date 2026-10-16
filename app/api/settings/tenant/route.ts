import { NextResponse } from "next/server";
import { withPermission } from "@/lib/permissions/permission-service";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { TenantService } from "@/services/tenant.service";
import { tenantSettingsSchema } from "@/validations/tenant.schema";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";

const tenantService = new TenantService();

export const GET = withPermission(
  PERMISSIONS.SYSTEM_MANAGE,
  async (_req, { tenantId }) => {
    try {
      const tenant = await tenantService.getTenant(tenantId);

      return NextResponse.json(
        createSuccessResponse({
          id: tenant.id,
          hubTenantId: tenant.hubTenantId,
          name: tenant.name,
          slug: tenant.slug,
          status: tenant.status,
          subscriptionStatus: tenant.subscriptionStatus,
          receiptHeader: tenant.receiptHeader,
          taxId: tenant.taxId,
          defaultCurrency: tenant.defaultCurrency,
          defaultLocale: tenant.defaultLocale,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt,
        })
      );
    } catch (error) {
      const { statusCode, body } = createErrorResponse(error);
      return NextResponse.json(body, { status: statusCode });
    }
  }
);

export const PATCH = withPermission(
  PERMISSIONS.SYSTEM_MANAGE,
  async (req, { tenantId }) => {
    try {
      const body = await req.json();
      const validated = tenantSettingsSchema.safeParse(body);

      if (!validated.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid tenant settings payload",
              details: validated.error.flatten(),
            },
          },
          { status: 400 }
        );
      }

      const updated = await tenantService.updateSettings(tenantId, validated.data);

      return NextResponse.json(
        createSuccessResponse({
          id: updated.id,
          hubTenantId: updated.hubTenantId,
          name: updated.name,
          slug: updated.slug,
          subscriptionStatus: updated.subscriptionStatus,
          receiptHeader: updated.receiptHeader,
          taxId: updated.taxId,
          defaultCurrency: updated.defaultCurrency,
          updatedAt: updated.updatedAt,
        })
      );
    } catch (error) {
      const { statusCode, body } = createErrorResponse(error);
      return NextResponse.json(body, { status: statusCode });
    }
  }
);
