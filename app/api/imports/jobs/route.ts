import { NextResponse } from "next/server";
import { MigrationService } from "@/services/migration.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export const GET = withPermission(PERMISSIONS.SYSTEM_MANAGE, async (_request: Request, context) => {
  try {
    const migrationService = new MigrationService(context.tenantId);
    const jobs = await migrationService.listImportJobs();

    return NextResponse.json(createSuccessResponse(jobs));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
