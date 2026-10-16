import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow static files, internal Hub webhooks, auth callbacks, and the suspended page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/internal") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/suspended"
  ) {
    return NextResponse.next();
  }

  // 2. Resolve subscription status
  let subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELLED" = "ACTIVE";

  const headerStatus = req.headers.get("x-subscription-status");
  if (headerStatus === "PAST_DUE" || headerStatus === "CANCELLED" || headerStatus === "ACTIVE") {
    subscriptionStatus = headerStatus;
  } else {
    const sessionCookie = req.cookies.get("pms_session")?.value;
    if (sessionCookie) {
      try {
        const secret = new TextEncoder().encode(
          process.env.HUB_SSO_SECRET || "dev-super-secure-hub-sso-secret-key-32-chars-minimum"
        );
        const { payload } = await jwtVerify(sessionCookie, secret);
        if (
          payload.subscriptionStatus === "ACTIVE" ||
          payload.subscriptionStatus === "PAST_DUE" ||
          payload.subscriptionStatus === "CANCELLED"
        ) {
          subscriptionStatus = payload.subscriptionStatus;
        }
      } catch {
        // Invalid or expired token is handled downstream by auth guards
      }
    }
  }

  const isSuspended = subscriptionStatus === "PAST_DUE" || subscriptionStatus === "CANCELLED";

  if (isSuspended) {
    // A. Intercept browser navigation to dashboard pages
    if (pathname.startsWith("/dashboard")) {
      const url = req.nextUrl.clone();
      url.pathname = "/suspended";
      return NextResponse.redirect(url);
    }

    // B. Block all mutating API endpoints with 402 Payment Required
    if (pathname.startsWith("/api")) {
      const method = req.method.toUpperCase();
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SUBSCRIPTION_SUSPENDED",
              message:
                "Pharmacy tenant account is suspended due to outstanding subscription dues. Write actions are locked.",
              subscriptionStatus,
            },
          },
          { status: 402 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/suspended",
  ],
};
