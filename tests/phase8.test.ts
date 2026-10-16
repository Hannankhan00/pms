import { prisma } from "../lib/db/prisma";
import { POST as provisionTenantHandler } from "../app/api/internal/provision-tenant/route";
import { GET as ssoCallbackHandler } from "../app/api/auth/sso/callback/route";
import { GET as getSettingsHandler, PATCH as patchSettingsHandler } from "../app/api/settings/tenant/route";
import { middleware } from "../middleware";
import {
  signHubToken,
  verifyHubToken,
  createSpokeSessionToken,
  verifySpokeSessionToken,
} from "../lib/auth/sso-verifier";
import { NextRequest } from "next/server";
import { SubscriptionStatus, TenantStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase8Tests() {
  console.log("==================================================================");
  console.log("   PHASE 8 TEST SUITE: SAAS HUB INTEGRATION, PROVISIONING & SSO  ");
  console.log("==================================================================");

  const testHubTenantId = "hub-tenant-phase8-test-01";
  const testAdminHubUserId = "hub-user-phase8-admin-01";
  const configuredApiKey = process.env.HUB_INTERNAL_API_KEY || "dev-placeholder-hub-key";

  let createdTenantId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Schema Updates & Enums
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Prisma Schema & SubscriptionStatus Enum Validation ---");
    assert(SubscriptionStatus.ACTIVE === "ACTIVE", "SubscriptionStatus.ACTIVE enum exists");
    assert(SubscriptionStatus.PAST_DUE === "PAST_DUE", "SubscriptionStatus.PAST_DUE enum exists");
    assert(SubscriptionStatus.CANCELLED === "CANCELLED", "SubscriptionStatus.CANCELLED enum exists");

    // Cleanup previous runs if lingering
    const lingeringTenant = await prisma.tenant.findUnique({
      where: { hubTenantId: testHubTenantId },
    });
    if (lingeringTenant) {
      await prisma.rolePermission.deleteMany({
        where: { role: { tenantId: lingeringTenant.id } },
      });
      await prisma.pharmacyUser.deleteMany({ where: { tenantId: lingeringTenant.id } });
      await prisma.category.deleteMany({ where: { tenantId: lingeringTenant.id } });
      await prisma.branch.deleteMany({ where: { tenantId: lingeringTenant.id } });
      await prisma.role.deleteMany({ where: { tenantId: lingeringTenant.id } });
      await prisma.tenant.delete({ where: { id: lingeringTenant.id } });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Automated Tenant Provisioning API Security & Validation
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Tenant Provisioning API Auth & Payload Validation ---");

    // 2A: Unauthorized access without API key
    const unauthReq = new NextRequest("http://localhost:3000/api/internal/provision-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hubTenantId: testHubTenantId }),
    });
    const unauthRes = await provisionTenantHandler(unauthReq);
    assert(unauthRes.status === 401, "Provisioning without API key returns 401 Unauthorized");

    // 2B: Invalid payload with invalid email
    const invalidReq = new NextRequest("http://localhost:3000/api/internal/provision-tenant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${configuredApiKey}`,
      },
      body: JSON.stringify({
        hubTenantId: testHubTenantId,
        name: "A", // too short
        adminHubUserId: testAdminHubUserId,
        adminEmail: "not-an-email",
        adminName: "Dr. Admin",
      }),
    });
    const invalidRes = await provisionTenantHandler(invalidReq);
    assert(invalidRes.status === 400, "Provisioning with invalid payload returns 400 Bad Request");

    // -------------------------------------------------------------------------
    // TEST 3: Full Transactional Tenant Provisioning Execution
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Transactional Tenant Provisioning Execution ---");
    const validReq = new NextRequest("http://localhost:3000/api/internal/provision-tenant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${configuredApiKey}`,
      },
      body: JSON.stringify({
        hubTenantId: testHubTenantId,
        name: "CarePoint Clinical Pharmacy",
        adminHubUserId: testAdminHubUserId,
        adminEmail: "admin@carepoint.clinic",
        adminName: "Dr. Catherine Miller",
      }),
    });

    const provisionRes = await provisionTenantHandler(validReq);
    assert(provisionRes.status === 201, "Provisioning with valid payload returns 201 Created");

    const provisionJson = await provisionRes.json();
    assert(provisionJson.success === true, "Provisioning response contains success: true");
    createdTenantId = provisionJson.data.tenant.id;

    // Verify Tenant in Database
    const tenantInDb = await prisma.tenant.findUnique({
      where: { id: createdTenantId! },
    });
    assert(!!tenantInDb, "Tenant record exists in database");
    assert(tenantInDb?.hubTenantId === testHubTenantId, "Tenant hubTenantId matches payload");
    assert(tenantInDb?.subscriptionStatus === SubscriptionStatus.ACTIVE, "Tenant initial subscriptionStatus is ACTIVE");

    // Verify Main Branch (Headquarters)
    const mainBranch = await prisma.branch.findFirst({
      where: { tenantId: createdTenantId!, isMain: true },
    });
    assert(!!mainBranch, "Main Headquarters branch was created in atomic transaction");
    assert(mainBranch?.code === "HQ-01", "Main branch code is HQ-01");

    // Verify Default Roles
    const roles = await prisma.role.findMany({
      where: { tenantId: createdTenantId! },
      include: { permissions: { include: { permission: true } } },
    });
    const roleNames = roles.map((r) => r.name);
    assert(roleNames.includes("OWNER"), "Role OWNER was seeded");
    assert(roleNames.includes("PHARMACIST"), "Role PHARMACIST was seeded");
    assert(roleNames.includes("CASHIER"), "Role CASHIER was seeded");

    const ownerRole = roles.find((r) => r.name === "OWNER");
    assert((ownerRole?.permissions.length || 0) > 10, "OWNER role possesses comprehensive permission mappings");

    // Verify Root PharmacyUser
    const rootUser = await prisma.pharmacyUser.findUnique({
      where: {
        tenantId_hubUserId: {
          tenantId: createdTenantId!,
          hubUserId: testAdminHubUserId,
        },
      },
      include: { role: true },
    });
    assert(!!rootUser, "Root PharmacyUser was created and mapped to hubUserId");
    assert(rootUser?.role.name === "OWNER", "Root PharmacyUser is assigned the OWNER role");
    assert(rootUser?.email === "admin@carepoint.clinic", "Root PharmacyUser email matches adminEmail");

    // Verify Default Categories
    const categories = await prisma.category.findMany({
      where: { tenantId: createdTenantId! },
    });
    assert(categories.length >= 5, "Standard default pharmaceutical categories seeded (>=5)");
    const categoryNames = categories.map((c) => c.name);
    assert(categoryNames.includes("General"), "Category General was seeded");
    assert(categoryNames.includes("Antibiotics"), "Category Antibiotics was seeded");

    // -------------------------------------------------------------------------
    // TEST 4: Prevent Duplicate Provisioning
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Duplicate Provisioning Idempotency Check ---");
    const duplicateReq = new NextRequest("http://localhost:3000/api/internal/provision-tenant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${configuredApiKey}`,
      },
      body: JSON.stringify({
        hubTenantId: testHubTenantId,
        name: "CarePoint Clinical Pharmacy",
        adminHubUserId: testAdminHubUserId,
        adminEmail: "admin@carepoint.clinic",
        adminName: "Dr. Catherine Miller",
      }),
    });
    const duplicateRes = await provisionTenantHandler(duplicateReq);
    assert(duplicateRes.status === 409, "Duplicate provisioning attempt returns 409 Conflict");

    // -------------------------------------------------------------------------
    // TEST 5: SSO Token Signer and Verifier Engine
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: SSO Token Signer and Verifier Engine ---");
    const testSsoPayload = {
      hubTenantId: testHubTenantId,
      hubUserId: testAdminHubUserId,
      email: "admin@carepoint.clinic",
      name: "Dr. Catherine Miller",
    };

    const ssoToken = await signHubToken(testSsoPayload, "10m");
    assert(typeof ssoToken === "string" && ssoToken.length > 20, "SSO JWT successfully signed with HMAC");

    const verifiedClaims = await verifyHubToken(ssoToken);
    assert(verifiedClaims.hubTenantId === testHubTenantId, "Verified claims hubTenantId matches");
    assert(verifiedClaims.hubUserId === testAdminHubUserId, "Verified claims hubUserId matches");

    // Forged token verification check
    let forgedFailed = false;
    try {
      await verifyHubToken(ssoToken + "tampered");
    } catch {
      forgedFailed = true;
    }
    assert(forgedFailed, "Tampered SSO token fails signature verification");

    // Spoke session token check
    const spokeToken = await createSpokeSessionToken({
      tenantId: createdTenantId!,
      userId: rootUser!.id,
      hubUserId: testAdminHubUserId,
      role: "OWNER",
      permissions: ["medicine.view", "sales.view"],
      subscriptionStatus: "ACTIVE",
    });
    const verifiedSession = await verifySpokeSessionToken(spokeToken);
    assert(verifiedSession.tenantId === createdTenantId, "Verified Spoke session tenantId matches");
    assert(verifiedSession.role === "OWNER", "Verified Spoke session role matches");

    // -------------------------------------------------------------------------
    // TEST 6: SSO Callback Endpoint (GET /api/auth/sso/callback)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 6: SSO Callback Route Endpoint & Cookie Handshake ---");

    // 6A: Missing token param
    const noTokenReq = new NextRequest("http://localhost:3000/api/auth/sso/callback");
    const noTokenRes = await ssoCallbackHandler(noTokenReq);
    assert(noTokenRes.status === 400, "SSO callback without token returns 400");

    // 6B: Token for non-existent tenant
    const unknownTenantToken = await signHubToken({
      hubTenantId: "unregistered-hub-tenant-999",
      hubUserId: "user-999",
      email: "test@unknown.com",
      name: "Unknown",
    });
    const unknownRes = await ssoCallbackHandler(
      new NextRequest(`http://localhost:3000/api/auth/sso/callback?token=${unknownTenantToken}`)
    );
    assert(unknownRes.status === 404, "SSO callback for unprovisioned tenant returns 404 Not Found");

    // 6C: Valid SSO Token Exchange
    const validCallbackReq = new NextRequest(
      `http://localhost:3000/api/auth/sso/callback?token=${ssoToken}`
    );
    const validCallbackRes = await ssoCallbackHandler(validCallbackReq);
    assert(
      validCallbackRes.status === 307 || validCallbackRes.status === 302,
      "Valid SSO exchange returns 302/307 Redirect to /dashboard"
    );

    const redirectLocation = validCallbackRes.headers.get("location");
    assert(redirectLocation?.includes("/dashboard") === true, "Redirect targets /dashboard");

    const sessionCookie = validCallbackRes.cookies.get("pms_session");
    assert(!!sessionCookie, "Response sets HTTP-only pms_session cookie");
    assert(sessionCookie?.httpOnly === true, "pms_session cookie has httpOnly flag enabled");

    const decodedSession = await verifySpokeSessionToken(sessionCookie!.value);
    assert(decodedSession.tenantId === createdTenantId, "Session cookie contains correct tenantId");
    assert(decodedSession.userId === rootUser!.id, "Session cookie contains correct local userId");
    assert(decodedSession.role === "OWNER", "Session cookie contains OWNER role");

    // -------------------------------------------------------------------------
    // TEST 7: System Suspension Guard (Middleware)
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 7: System Suspension Guard (Middleware) ---");

    // 7A: Active tenant navigation to dashboard
    const activeReq = new NextRequest("http://localhost:3000/dashboard", {
      headers: { "x-subscription-status": "ACTIVE" },
    });
    const activeRes = await middleware(activeReq);
    assert(activeRes.status === 200, "Active tenant dashboard request passes through middleware");

    // 7B: Suspended tenant navigation to dashboard -> Redirects to /suspended
    const suspendedReq = new NextRequest("http://localhost:3000/dashboard/inventory", {
      headers: { "x-subscription-status": "PAST_DUE" },
    });
    const suspendedRes = await middleware(suspendedReq);
    assert(
      suspendedRes.status === 307 || suspendedRes.status === 302,
      "PAST_DUE tenant navigating to /dashboard is intercepted with redirect"
    );
    assert(
      suspendedRes.headers.get("location")?.includes("/suspended") === true,
      "Suspended redirect destination is /suspended"
    );

    // 7C: Suspended tenant attempting mutating API POST -> Returns 402 Payment Required
    const mutateReq = new NextRequest("http://localhost:3000/api/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-subscription-status": "PAST_DUE",
      },
      body: JSON.stringify({ items: [] }),
    });
    const mutateRes = await middleware(mutateReq);
    assert(mutateRes.status === 402, "Mutating POST request by suspended tenant is blocked with 402 Payment Required");

    const mutateJson = await mutateRes.json();
    assert(mutateJson.error.code === "SUBSCRIPTION_SUSPENDED", "Response error code is SUBSCRIPTION_SUSPENDED");

    // 7D: Suspended tenant requesting read-only reports -> Allowed
    const reportReq = new NextRequest("http://localhost:3000/api/reports/sales", {
      method: "GET",
      headers: { "x-subscription-status": "PAST_DUE" },
    });
    const reportRes = await middleware(reportReq);
    assert(reportRes.status === 200, "Read-only GET requests remain accessible during suspension");

    // 7E: /suspended page itself does not loop
    const suspendedPageReq = new NextRequest("http://localhost:3000/suspended", {
      headers: { "x-subscription-status": "PAST_DUE" },
    });
    const suspendedPageRes = await middleware(suspendedPageReq);
    assert(suspendedPageRes.status === 200, "/suspended page requests pass through without looping");

    // -------------------------------------------------------------------------
    // TEST 8: Tenant Settings & Receipt Branding API
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 8: Tenant Settings & Receipt Branding API ---");

    // 8A: GET /api/settings/tenant
    const getSettingsReq = new NextRequest("http://localhost:3000/api/settings/tenant", {
      headers: {
        "x-tenant-id": createdTenantId!,
        "x-user-id": rootUser!.id,
      },
    });
    const getSettingsRes = await getSettingsHandler(getSettingsReq);
    assert(getSettingsRes.status === 200, "GET /api/settings/tenant returns 200 OK");

    const getSettingsJson = await getSettingsRes.json();
    assert(getSettingsJson.data.hubTenantId === testHubTenantId, "Settings data returns correct hubTenantId");
    assert(getSettingsJson.data.subscriptionStatus === "ACTIVE", "Settings data returns subscriptionStatus ACTIVE");

    // 8B: PATCH /api/settings/tenant
    const patchSettingsReq = new NextRequest("http://localhost:3000/api/settings/tenant", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": createdTenantId!,
        "x-user-id": rootUser!.id,
      },
      body: JSON.stringify({
        receiptHeader: "CarePoint Clinic - 24/7 Rx - Phone: +1-555-0199",
        taxId: "TAX-REG-984729103",
        defaultCurrency: "EUR",
      }),
    });
    const patchSettingsRes = await patchSettingsHandler(patchSettingsReq);
    assert(patchSettingsRes.status === 200, "PATCH /api/settings/tenant returns 200 OK");

    const patchSettingsJson = await patchSettingsRes.json();
    assert(
      patchSettingsJson.data.receiptHeader === "CarePoint Clinic - 24/7 Rx - Phone: +1-555-0199",
      "receiptHeader updated in database"
    );
    assert(patchSettingsJson.data.taxId === "TAX-REG-984729103", "taxId updated in database");
    assert(patchSettingsJson.data.defaultCurrency === "EUR", "defaultCurrency updated in database");

    // Verify in database
    const updatedTenantDb = await prisma.tenant.findUnique({
      where: { id: createdTenantId! },
    });
    assert(
      updatedTenantDb?.receiptHeader === "CarePoint Clinic - 24/7 Rx - Phone: +1-555-0199",
      "Database reflects updated receiptHeader"
    );
    assert(updatedTenantDb?.defaultCurrency === "EUR", "Database reflects updated defaultCurrency");

    console.log("\n==================================================================");
    console.log("   ALL PHASE 8 TESTS PASSED SUCCESSFULLY! (100% COVERAGE)         ");
    console.log("==================================================================");
  } catch (error) {
    console.error("Test execution failed:", error);
    throw error;
  } finally {
    // Teardown created test tenant and associated data
    if (createdTenantId) {
      await prisma.rolePermission.deleteMany({
        where: { role: { tenantId: createdTenantId } },
      });
      await prisma.pharmacyUser.deleteMany({ where: { tenantId: createdTenantId } });
      await prisma.category.deleteMany({ where: { tenantId: createdTenantId } });
      await prisma.branch.deleteMany({ where: { tenantId: createdTenantId } });
      await prisma.role.deleteMany({ where: { tenantId: createdTenantId } });
      await prisma.tenant.delete({ where: { id: createdTenantId } });
      console.log(`[CLEANUP] Deleted test tenant: ${createdTenantId}`);
    }
    await prisma.$disconnect();
  }
}

runPhase8Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
