import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { checkRateLimit } from "@/lib/security/rate-limiter";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow static files and the suspended page
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/suspended"
  ) {
    return NextResponse.next();
  }

  // 2. Security: Apply Rate Limiting to API Routes
  if (pathname.startsWith("/api")) {
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    const rateLimit = checkRateLimit(clientIp, pathname);
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, rateLimit.resetTime - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Please back off before retrying.",
            retryAfter: retryAfterSec,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetTime),
          },
        }
      );
    }
  }

  // 3. Skip suspension checks for auth callbacks and internal provision webhooks
  if (pathname.startsWith("/api/internal") || pathname.startsWith("/api/auth")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 4. Resolve subscription status
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
        // Invalid or expired token handled downstream by auth guards
      }
    }
  }

  const isSuspended = subscriptionStatus === "PAST_DUE" || subscriptionStatus === "CANCELLED";

  if (isSuspended) {
    // Intercept browser navigation to dashboard pages
    if (pathname.startsWith("/dashboard")) {
      const url = req.nextUrl.clone();
      url.pathname = "/suspended";
      return NextResponse.redirect(url);
    }

    // Block all mutating API endpoints with 402 Payment Required
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

  return addSecurityHeaders(NextResponse.next());
}

/**
 * Hardens responses with standard production security headers.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/:path*",
    "/suspended",
  ],
};
