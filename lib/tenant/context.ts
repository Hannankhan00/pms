import { DEV_TENANT, DEV_USER, DEV_BRANCH } from "./constants";
import { AuthenticationError } from "../errors/app-error";

export interface TenantContext {
  tenantId: string;
  userId: string;
  hubUserId: string;
  branchId?: string;
  isMock: boolean;
}

export interface ContextOverrides {
  tenantId?: string;
  userId?: string;
  hubUserId?: string;
  branchId?: string;
}

/**
 * Retrieves the current active tenant and user context.
 *
 * PHASE 0 SECURITY HARDENING:
 * - In Development & Test modes: Falls back to DEV_TENANT and accepts test overrides.
 * - In Production mode: Explicitly rejects untrusted client header overrides.
 *
 * FUTURE HUB SSO REPLACEMENT PATH:
 * When the Central Hub is built, this function will:
 * 1. Read the HTTP-only cross-subdomain cookie (`__session` or `hub_token`).
 * 2. Verify the JWT signature using the Hub's public key (JWKS / ed25519).
 * 3. Extract the validated `tenantId`, `hubUserId`, and role claims.
 * 4. Resolve the local `PharmacyUser` membership record.
 * 5. Return the verified `TenantContext`.
 * Downstream services, repositories, and UI components require zero changes.
 */
export async function getTenantContext(overrides?: ContextOverrides): Promise<TenantContext> {
  const isProduction = process.env.NODE_ENV === "production";

  // Production Security Boundary: Never trust client-supplied tenant/user overrides
  if (isProduction && (overrides?.tenantId || overrides?.userId)) {
    throw new AuthenticationError(
      "SECURITY VIOLATION: Untrusted client tenant overrides are strictly rejected in production"
    );
  }

  // Development / Test Mock Resolution
  const tenantId = overrides?.tenantId || DEV_TENANT.id;
  const userId = overrides?.userId || DEV_USER.id;
  const hubUserId = overrides?.hubUserId || DEV_USER.hubUserId;
  const branchId = overrides?.branchId || DEV_BRANCH.id;

  if (!tenantId || !userId) {
    throw new AuthenticationError("No tenant context could be resolved");
  }

  return {
    tenantId,
    userId,
    hubUserId,
    branchId,
    isMock: !overrides?.tenantId,
  };
}

/**
 * Strict helper for protected operations that require an authenticated tenant context.
 */
export async function requireTenantContext(overrides?: ContextOverrides): Promise<TenantContext> {
  const context = await getTenantContext(overrides);
  if (!context.tenantId || !context.userId) {
    throw new AuthenticationError("Active tenant context is required");
  }
  return context;
}
