import { SignJWT, jwtVerify } from "jose";

export interface HubSsoPayload {
  hubTenantId: string;
  hubUserId: string;
  email: string;
  name: string;
  role?: string;
  [key: string]: unknown;
}

export interface SpokeSessionPayload {
  tenantId: string;
  userId: string;
  hubUserId: string;
  role: string;
  permissions: string[];
  subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  [key: string]: unknown;
}

const DEFAULT_SECRET = "dev-super-secure-hub-sso-secret-key-32-chars-minimum";

function getSsoSecret(): Uint8Array {
  const secret = process.env.HUB_SSO_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
}

/**
 * Verifies an incoming SSO token signed by the Central Hub.
 */
export async function verifyHubToken(token: string): Promise<HubSsoPayload> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid or missing SSO token");
  }

  const secretKey = getSsoSecret();
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
  });

  const hubTenantId = payload.hubTenantId as string;
  const hubUserId = (payload.hubUserId || payload.sub) as string;
  const email = payload.email as string;
  const name = (payload.name as string) || "Hub User";
  const role = payload.role as string | undefined;

  if (!hubTenantId || !hubUserId) {
    throw new Error("SSO token is missing mandatory hubTenantId or hubUserId claims");
  }

  return {
    hubTenantId,
    hubUserId,
    email: email || "",
    name,
    role,
    ...payload,
  };
}

/**
 * Generates an SSO token simulating the Hub's signature (used by tests & Hub integrations).
 */
export async function signHubToken(
  payload: HubSsoPayload,
  expiresIn: string = "15m"
): Promise<string> {
  const secretKey = getSsoSecret();

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.hubUserId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Creates an authenticated Spoke local session token (JWT).
 */
export async function createSpokeSessionToken(
  payload: SpokeSessionPayload,
  expiresIn: string = "7d"
): Promise<string> {
  const secretKey = getSsoSecret();

  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

/**
 * Verifies a Spoke local session token (JWT).
 */
export async function verifySpokeSessionToken(token: string): Promise<SpokeSessionPayload> {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid or missing session token");
  }

  const secretKey = getSsoSecret();
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
  });

  return {
    tenantId: payload.tenantId as string,
    userId: payload.userId as string,
    hubUserId: payload.hubUserId as string,
    role: payload.role as string,
    permissions: (payload.permissions as string[]) || [],
    subscriptionStatus: (payload.subscriptionStatus as "ACTIVE" | "PAST_DUE" | "CANCELLED") || "ACTIVE",
    ...payload,
  };
}
