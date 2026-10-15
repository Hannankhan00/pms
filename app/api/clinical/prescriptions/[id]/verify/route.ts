import { NextResponse } from "next/server";
import { ClinicalService } from "@/services/clinical.service";
import { createSuccessResponse } from "@/lib/errors/app-error";
import { withPermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

/**
 * Clinical Verification Gate:
 * Strictly protected by PERMISSIONS.RX_VERIFY ('prescription.verify').
 * Transitions prescription status to VERIFIED or REJECTED and logs pharmacist ID.
 */
export const PATCH = withPermission(
  "RX_VERIFY",
  async (
    request: Request,
    context: { tenantId: string; userId: string },
    routeContext?: { params: Promise<{ id: string }> | { id: string } }
  ) => {
    let id: string;
    if (routeContext?.params) {
      const resolvedParams = await routeContext.params;
      id = resolvedParams.id;
    } else {
      const url = new URL(request.url);
      const segments = url.pathname.split("/");
      id = segments[segments.length - 2];
    }

    let body: unknown = undefined;
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Body is optional if verifying with default VERIFIED status
    }

    const clinicalService = new ClinicalService(context.tenantId);
    const verifiedRx = await clinicalService.verifyPrescription(context.userId, id, body);

    return NextResponse.json(createSuccessResponse(verifiedRx));
  }
);
