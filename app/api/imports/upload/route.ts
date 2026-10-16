import { NextResponse } from "next/server";
import { ImportEntity } from "@prisma/client";
import { MigrationService } from "@/services/migration.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { withPermission } from "@/lib/permissions/permission-service";

export const dynamic = "force-dynamic";

export const POST = withPermission(PERMISSIONS.SYSTEM_MANAGE, async (request: Request, context) => {
  try {
    let entity: ImportEntity | undefined;
    let csvContent: string = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const entityStr = formData.get("entity") as string;
      const file = formData.get("file") as File | null;

      if (!entityStr || !file) {
        return NextResponse.json(
          createErrorResponse("Both 'entity' and 'file' fields are required in multipart form data").body,
          { status: 400 }
        );
      }

      entity = entityStr as ImportEntity;
      csvContent = await file.text();
    } else {
      const body = await request.json();
      entity = body.entity as ImportEntity;
      csvContent = body.csvContent || "";
    }

    if (!entity || !Object.values(ImportEntity).includes(entity)) {
      return NextResponse.json(
        createErrorResponse(`Invalid entity. Supported: ${Object.values(ImportEntity).join(", ")}`).body,
        { status: 400 }
      );
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(createErrorResponse("CSV file content cannot be empty").body, { status: 400 });
    }

    const migrationService = new MigrationService(context.tenantId);
    const result = await migrationService.processCsvImport({
      userId: context.userId,
      entity,
      csvContent,
    });

    return NextResponse.json(createSuccessResponse(result), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
});
