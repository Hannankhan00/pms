import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyHubToken, createSpokeSessionToken, SpokeSessionPayload } from "@/lib/auth/sso-verifier";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing required SSO token parameter",
          },
        },
        { status: 400 }
      );
    }

    // 1. Verify Hub SSO signature and claims
    const verifiedHubPayload = await verifyHubToken(token);
    const { hubTenantId, hubUserId } = verifiedHubPayload;

    // 2. Lookup local Tenant by hubTenantId
    const tenant = await prisma.tenant.findUnique({
      where: { hubTenantId },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Tenant with Hub ID '${hubTenantId}' is not provisioned on this Spoke`,
          },
        },
        { status: 404 }
      );
    }

    // 3. Lookup local PharmacyUser mapped to hubUserId
    const user = await prisma.pharmacyUser.findUnique({
      where: {
        tenantId_hubUserId: {
          tenantId: tenant.id,
          hubUserId,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: `User '${hubUserId}' is not recognized for this pharmacy`,
          },
        },
        { status: 403 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "User account has been deactivated",
          },
        },
        { status: 403 }
      );
    }

    // 4. Extract role and permissions
    const roleName = user.role?.name || "STAFF";
    const permissions = user.role?.permissions?.map((rp) => rp.permission.code) || [];

    // 5. Construct Spoke local session payload
    const sessionPayload: SpokeSessionPayload = {
      tenantId: tenant.id,
      userId: user.id,
      hubUserId,
      role: roleName,
      permissions,
      subscriptionStatus: tenant.subscriptionStatus,
    };

    const sessionToken = await createSpokeSessionToken(sessionPayload);

    // 6. Redirect to dashboard with HTTP-only cookie
    const targetUrl = new URL("/dashboard", req.url);
    const customRedirect = searchParams.get("redirect");
    if (customRedirect && customRedirect.startsWith("/") && !customRedirect.startsWith("//")) {
      targetUrl.pathname = customRedirect;
    }

    const response = NextResponse.redirect(targetUrl);

    response.cookies.set("pms_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SSO_VERIFICATION_FAILED",
          message: error?.message || "Failed to verify SSO token",
        },
      },
      { status: 401 }
    );
  }
}
