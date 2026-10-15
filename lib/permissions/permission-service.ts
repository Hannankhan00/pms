import { prisma } from "../db/prisma";
import { AuthorizationError, AuthenticationError, createErrorResponse } from "../errors/app-error";
import { getTenantContext } from "../tenant/context";
import { PermissionCode } from "./permissions";

/**
 * Cached or direct lookup for a user's permissions within a specific tenant.
 */
export async function getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
  const user = await prisma.pharmacyUser.findFirst({
    where: {
      id: userId,
      tenantId,
      isActive: true,
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

  if (!user || !user.role) {
    return [];
  }

  return user.role.permissions.map((rp) => rp.permission.code);
}

/**
 * Checks whether a user holds a specific permission code in the given tenant.
 */
export async function hasPermission(
  userId: string,
  tenantId: string,
  permissionCode: PermissionCode | string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, tenantId);
  return permissions.includes(permissionCode);
}

export { PERMISSIONS, type PermissionCode } from "./permissions";

/**
 * Server-side security guard that enforces a specific permission.
 * Throws an AuthorizationError (403) if the user lacks the permission.
 */
export async function requirePermission(
  firstArg: PermissionCode | string,
  secondArg?: string | { userId?: string; tenantId?: string },
  thirdArg?: PermissionCode | string
): Promise<{ tenantId: string; userId: string; permissions: string[] }> {
  let permissionCode: string;
  let overrides: { userId?: string; tenantId?: string } | undefined;

  if (typeof secondArg === "string" && thirdArg) {
    // Called as: requirePermission(userId, tenantId, permissionCode)
    overrides = { userId: firstArg, tenantId: secondArg };
    permissionCode = thirdArg;
  } else {
    // Called as: requirePermission(permissionCode, overrides)
    permissionCode = firstArg;
    overrides = typeof secondArg === "object" ? secondArg : undefined;
  }

  const context = await getTenantContext(overrides);

  if (!context.userId || !context.tenantId) {
    throw new AuthenticationError("User session could not be established");
  }

  const permissions = await getUserPermissions(context.userId, context.tenantId);

  if (!permissions.includes(permissionCode)) {
    throw new AuthorizationError(`Access denied: Missing required permission '${permissionCode}'`);
  }

  return {
    tenantId: context.tenantId,
    userId: context.userId,
    permissions,
  };
}

/**
 * Route protection wrapper for Next.js App Router API handlers.
 * Verifies the user has the required permission code before proceeding,
 * returning a 403 Forbidden response if authorization fails.
 */
export function withPermission<T = any>(
  permissionCode: PermissionCode | string,
  handler: (
    req: Request,
    context: { tenantId: string; userId: string; permissions: string[] },
    routeContext?: T
  ) => Promise<Response>
) {
  return async (req: Request, routeContext?: T): Promise<Response> => {
    try {
      const tenantOverride = req.headers.get("x-tenant-id") ?? undefined;
      const userOverride = req.headers.get("x-user-id") ?? undefined;

      const authContext = await requirePermission(permissionCode, {
        tenantId: tenantOverride,
        userId: userOverride,
      });

      return await handler(req, authContext, routeContext);
    } catch (error) {
      const { statusCode, body } = createErrorResponse(error);
      return Response.json(body, { status: statusCode });
    }
  };
}
