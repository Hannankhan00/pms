import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";
import { BranchService } from "@/services/branch.service";
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

    const branchService = new BranchService(context.tenantId);
    const branches = await branchService.listBranches();

    return NextResponse.json(createSuccessResponse(branches));
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
    const branchService = new BranchService(context.tenantId);
    const branch = await branchService.createBranch(payload);

    return NextResponse.json(createSuccessResponse(branch), { status: 201 });
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
