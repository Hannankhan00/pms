import { prisma } from "../lib/db/prisma";
import { tenantDb } from "../lib/tenant/tenant-db";
import { getTenantContext } from "../lib/tenant/context";
import { BranchService } from "../services/branch.service";
import { requirePermission, getUserPermissions, PERMISSIONS } from "../lib/permissions";
import {
  AuthorizationError,
  TenantMismatchError,
  AuthenticationError,
} from "../lib/errors/app-error";
import { TenantStatus } from "@prisma/client";

async function runTestSuite() {
  console.log("==================================================================");
  console.log("[TEST_SUITE] RUNNING COMPREHENSIVE PHASE 0 MULTI-TENANCY & SECURITY TESTS");
  console.log("==================================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      throw new Error(`Test assertion failed: ${testName}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Tenant Context Retrieval (Acceptance Test 6)
    // ----------------------------------------------------
    console.log("--- 1. Testing Centralized Tenant Context ---");
    const defaultContext = await getTenantContext();
    assert(!!defaultContext.tenantId, "Tenant context resolves active tenantId");
    assert(!!defaultContext.userId, "Tenant context resolves active userId");
    assert(!!defaultContext.hubUserId, "Tenant context resolves hubUserId mapping");
    assert(
      defaultContext.tenantId === "tenant-dev-pharmacy-1",
      "Default tenant matches dev tenant ID"
    );

    // ----------------------------------------------------
    // TEST 2: Strict Tenant Isolation (findMany, findFirst, findUnique)
    // ----------------------------------------------------
    console.log("\n--- 2. Testing Strict Tenant Read Isolation ---");
    const tenantAlphaId = "tenant-test-alpha-" + Date.now();
    const tenantBetaId = "tenant-test-beta-" + Date.now();

    await prisma.tenant.create({
      data: {
        id: tenantAlphaId,
        name: "Alpha Pharmacy",
        slug: `alpha-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        name: "Beta Pharmacy",
        slug: `beta-${Date.now()}`,
        status: TenantStatus.ACTIVE,
      },
    });

    const alphaDb = tenantDb(tenantAlphaId);
    const betaDb = tenantDb(tenantBetaId);

    const branchAlpha1 = await alphaDb.branch.create({
      data: {
        name: "Alpha Downtown",
        code: "ALPHA-01",
        address: "100 Alpha St",
        isActive: true,
      },
    });

    const branchBeta1 = await betaDb.branch.create({
      data: {
        name: "Beta Uptown",
        code: "BETA-01",
        address: "200 Beta Ave",
        isActive: true,
      },
    });

    // 2a. findMany isolation
    const alphaBranches = await alphaDb.branch.findMany();
    assert(alphaBranches.length === 1, "Alpha findMany returns exactly Alpha's branch");
    assert(alphaBranches[0].id === branchAlpha1.id, "Alpha sees its own Downtown branch");
    assert(
      !alphaBranches.some((b: any) => b.id === branchBeta1.id),
      "Alpha findMany CANNOT see Beta's branch"
    );

    const betaBranches = await betaDb.branch.findMany();
    assert(betaBranches.length === 1, "Beta findMany returns exactly Beta's branch");
    assert(betaBranches[0].id === branchBeta1.id, "Beta sees its own Uptown branch");
    assert(
      !betaBranches.some((b: any) => b.id === branchAlpha1.id),
      "Beta findMany CANNOT see Alpha's branch"
    );

    // 2b. findFirst isolation
    const alphaFindFirst = await alphaDb.branch.findFirst({
      where: { code: "BETA-01" },
    });
    assert(alphaFindFirst === null, "Alpha findFirst searching for Beta's code returns null");

    // 2c. findUnique isolation
    const alphaFindBetaUnique = await alphaDb.branch.findUnique({
      where: { id: branchBeta1.id },
    });
    assert(alphaFindBetaUnique === null, "Alpha findUnique for Beta's ID returns null");

    let threwCompoundMismatch = false;
    try {
      await alphaDb.branch.findUnique({
        where: {
          tenantId_code: {
            tenantId: tenantBetaId,
            code: "BETA-01",
          },
        },
      });
    } catch (e) {
      if (e instanceof TenantMismatchError) threwCompoundMismatch = true;
    }
    assert(
      threwCompoundMismatch,
      "Compound unique query with foreign tenantId throws TenantMismatchError"
    );

    // ----------------------------------------------------
    // TEST 3: Strict Mutation Isolation (update, delete, createMany, updateMany, deleteMany)
    // ----------------------------------------------------
    console.log("\n--- 3. Testing Strict Mutation Isolation ---");

    // 3a. create with foreign tenantId must throw
    let threwCreateMismatch = false;
    try {
      await alphaDb.branch.create({
        data: {
          name: "Illegal Branch",
          code: "ILLEGAL-01",
          tenantId: tenantBetaId, // Mismatched tenantId
        },
      });
    } catch (e) {
      if (e instanceof TenantMismatchError) threwCreateMismatch = true;
    }
    assert(
      threwCreateMismatch,
      "Creating entity with mismatched foreign tenantId throws TenantMismatchError"
    );

    // 3b. createMany scopes automatically
    await alphaDb.branch.createMany({
      data: [
        { name: "Alpha East", code: "ALPHA-02" },
        { name: "Alpha West", code: "ALPHA-03" },
      ],
    });
    const alphaAllBranches = await alphaDb.branch.findMany();
    assert(alphaAllBranches.length === 3, "Alpha createMany successfully created 2 branches");
    assert(
      alphaAllBranches.every((b: any) => b.tenantId === tenantAlphaId),
      "Every branch created via createMany is scoped to tenantAlphaId"
    );

    // 3c. update cross-tenant entity must throw
    let threwUpdateMismatch = false;
    try {
      await alphaDb.branch.update({
        where: { id: branchBeta1.id },
        data: { name: "Malicious Rename" },
      });
    } catch (e) {
      if (e instanceof TenantMismatchError) threwUpdateMismatch = true;
    }
    assert(threwUpdateMismatch, "Updating foreign tenant record throws TenantMismatchError");

    // Verify Beta record was untouched
    const betaCheck = await betaDb.branch.findFirst({ where: { id: branchBeta1.id } });
    assert(betaCheck?.name === "Beta Uptown", "Beta record remained completely untouched");

    // 3d. updateMany isolation
    const updateManyResult = await alphaDb.branch.updateMany({
      where: { code: "BETA-01" },
      data: { name: "Tampered Name" },
    });
    assert(
      updateManyResult.count === 0,
      "Alpha updateMany searching for Beta records updates 0 rows"
    );

    // 3e. delete cross-tenant entity must throw
    let threwDeleteMismatch = false;
    try {
      await alphaDb.branch.delete({
        where: { id: branchBeta1.id },
      });
    } catch (e) {
      if (e instanceof TenantMismatchError) threwDeleteMismatch = true;
    }
    assert(threwDeleteMismatch, "Deleting foreign tenant record throws TenantMismatchError");

    // 3f. deleteMany isolation
    const deleteManyResult = await alphaDb.branch.deleteMany({
      where: { code: "BETA-01" },
    });
    assert(
      deleteManyResult.count === 0,
      "Alpha deleteMany searching for Beta records deletes 0 rows"
    );

    // ----------------------------------------------------
    // TEST 4: Transaction Atomicity & Scope Propagation
    // ----------------------------------------------------
    console.log("\n--- 4. Testing Transaction Atomicity & Isolation ---");

    // 4a. Transaction rollback test
    let transactionRolledBack = false;
    try {
      await alphaDb.transaction(async (txDb) => {
        await txDb.branch.create({
          data: { name: "Rollback Branch", code: "ROLLBACK-01" },
        });
        // Intentionally abort transaction
        throw new Error("Simulated Transaction Abort");
      });
    } catch {
      transactionRolledBack = true;
    }
    assert(transactionRolledBack, "Transaction caught deliberate abort signal");

    const checkRollback = await alphaDb.branch.findFirst({
      where: { code: "ROLLBACK-01" },
    });
    assert(
      checkRollback === null,
      "All operations inside aborted transaction were atomically rolled back"
    );

    // 4b. Successful atomic transaction preserving tenant isolation
    await alphaDb.transaction(async (txDb) => {
      assert(txDb.tenantId === tenantAlphaId, "txDb preserves tenantId context");
      await txDb.branch.create({
        data: { name: "Tx Branch", code: "TX-01" },
      });
    });
    const checkTxSuccess = await alphaDb.branch.findFirst({ where: { code: "TX-01" } });
    assert(checkTxSuccess !== null, "Successful transaction committed record cleanly");

    // ----------------------------------------------------
    // TEST 5: Production Security Boundary (Untrusted Header Rejection)
    // ----------------------------------------------------
    console.log("\n--- 5. Testing Production Environment Security ---");
    const env = process.env as Record<string, string | undefined>;
    const originalEnv = env.NODE_ENV;
    try {
      env.NODE_ENV = "production";
      let threwProdSecurityError = false;
      try {
        await getTenantContext({ tenantId: "malicious-hacker-tenant" });
      } catch (e) {
        if (e instanceof AuthenticationError) threwProdSecurityError = true;
      }
      assert(
        threwProdSecurityError,
        "Production environment strictly rejects client-supplied tenant overrides"
      );
    } finally {
      env.NODE_ENV = originalEnv;
    }

    // ----------------------------------------------------
    // TEST 6: Authorization & Permissions (Using PERMISSIONS Registry)
    // ----------------------------------------------------
    console.log("\n--- 6. Testing Permission-Based Authorization ---");
    const devContext = await getTenantContext();
    const adminPermissions = await getUserPermissions(devContext.userId, devContext.tenantId);
    assert(
      adminPermissions.includes(PERMISSIONS.MEDICINE_VIEW),
      "Admin user has PERMISSIONS.MEDICINE_VIEW"
    );
    assert(
      adminPermissions.includes(PERMISSIONS.SALES_CREATE),
      "Admin user has PERMISSIONS.SALES_CREATE"
    );
    assert(
      adminPermissions.includes(PERMISSIONS.USERS_MANAGE),
      "Admin user has PERMISSIONS.USERS_MANAGE"
    );

    // requirePermission should succeed for granted permission
    const guardResult = await requirePermission(PERMISSIONS.MEDICINE_VIEW, {
      tenantId: devContext.tenantId,
      userId: devContext.userId,
    });
    assert(
      guardResult.tenantId === devContext.tenantId,
      "requirePermission succeeds for valid role"
    );

    // Restricted user test
    const restrictedRole = await prisma.role.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Junior Trainee",
        description: "Read-only medicine access",
      },
    });

    const medicineViewPerm = await prisma.permission.findUnique({
      where: { code: PERMISSIONS.MEDICINE_VIEW },
    });
    if (medicineViewPerm) {
      await prisma.rolePermission.create({
        data: {
          roleId: restrictedRole.id,
          permissionId: medicineViewPerm.id,
        },
      });
    }

    const restrictedUser = await prisma.pharmacyUser.create({
      data: {
        tenantId: tenantAlphaId,
        hubUserId: "hub-trainee-1",
        roleId: restrictedRole.id,
        name: "Junior Trainee",
        email: `trainee-${Date.now()}@example.com`,
      },
    });

    const traineePerms = await getUserPermissions(restrictedUser.id, tenantAlphaId);
    assert(
      traineePerms.includes(PERMISSIONS.MEDICINE_VIEW),
      "Trainee has PERMISSIONS.MEDICINE_VIEW"
    );
    assert(
      !traineePerms.includes(PERMISSIONS.MEDICINE_DELETE),
      "Trainee does NOT have PERMISSIONS.MEDICINE_DELETE"
    );

    let threwAuthError = false;
    try {
      await requirePermission(PERMISSIONS.MEDICINE_DELETE, {
        tenantId: tenantAlphaId,
        userId: restrictedUser.id,
      });
    } catch (e) {
      if (e instanceof AuthorizationError) {
        threwAuthError = true;
      }
    }
    assert(threwAuthError, "Unauthorized permission check throws AuthorizationError (403)");

    // ----------------------------------------------------
    // TEST 7: Service Layer Business Rules
    // ----------------------------------------------------
    console.log("\n--- 7. Testing Service Layer & Business Rules ---");
    const alphaService = new BranchService(tenantAlphaId);

    let threwDuplicateError = false;
    try {
      await alphaService.createBranch({
        name: "Alpha Duplicate Code Branch",
        code: "ALPHA-01",
        isActive: true,
      });
    } catch {
      threwDuplicateError = true;
    }
    assert(threwDuplicateError, "Duplicate branch code within same tenant is blocked");

    // Clean up test tenants
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenantAlphaId, tenantBetaId] } },
    });

    console.log("\n==================================================================");
    console.log(`[SUITE_PASS] ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
    console.log("==================================================================");
  } catch (error) {
    console.error("\n[SUITE_ERROR] Test suite failed with error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
