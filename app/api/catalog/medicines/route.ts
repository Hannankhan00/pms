import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { CatalogService } from "@/services/catalog.service";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";

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
    const search = searchParams.get("search") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const catalogService = new CatalogService(context.tenantId);
    const medicines = await catalogService.listMedicines({
      search,
      categoryId,
      limit,
      offset: (page - 1) * limit,
    });

    return NextResponse.json(createSuccessResponse(medicines));
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantOverride = request.headers.get("x-tenant-id") ?? undefined;
    const userOverride = request.headers.get("x-user-id") ?? undefined;

    const context = await getTenantContext({
      tenantId: tenantOverride,
      userId: userOverride,
    });

    const payload = await request.json();
    const catalogService = new CatalogService(context.tenantId);
    const medicine = await catalogService.createMedicine(context.userId, payload);

    return NextResponse.json(createSuccessResponse(medicine), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
