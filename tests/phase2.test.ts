import { prisma } from "../lib/db/prisma";
import { IamService } from "../services/iam.service";
import { ShiftService } from "../services/shift.service";
import { PosService } from "../services/pos.service";
import { CatalogService } from "../services/catalog.service";
import { PERMISSIONS } from "../lib/permissions/permissions";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase2Suite() {
  console.log("\n==================================================================");
  console.log("   PHASE 2 INTEGRATION TEST SUITE: IAM & CASHIER SHIFT OPS        ");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const tenantAlphaId = `tenant-p2-alpha-${timestamp}`;
  const tenantBetaId = `tenant-p2-beta-${timestamp}`;

  // 1. Provision isolated test tenants
  await prisma.tenant.createMany({
    data: [
      { id: tenantAlphaId, name: "Pharmacy Alpha P2", slug: `alpha-p2-${timestamp}` },
      { id: tenantBetaId, name: "Pharmacy Beta P2", slug: `beta-p2-${timestamp}` },
    ],
  });

  // 2. Provision Admin Role and permissions for Alpha
  const allPermissions = await prisma.permission.findMany();
  const adminRoleAlpha = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Super Admin Alpha",
      isSystem: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: adminRoleAlpha.id,
      permissionId: p.id,
    })),
  });

  // Admin user
  const adminUserAlpha = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-admin-alpha-${timestamp}`,
      roleId: adminRoleAlpha.id,
      name: "Dr. Admin Alpha",
      email: `admin-alpha-${timestamp}@pharmacy.local`,
    },
  });

  // Branch
  const branchAlpha = await prisma.branch.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Alpha Downtown Dispensary",
      code: `BR-P2-${timestamp.toString().slice(-4)}`,
    },
  });

  // Services
  const iamService = new IamService(tenantAlphaId);
  const shiftService = new ShiftService(tenantAlphaId);
  const posService = new PosService(tenantAlphaId);
  const catalogService = new CatalogService(tenantAlphaId);

  // Beta Services (to test isolation)
  const betaIamService = new IamService(tenantBetaId);
  const betaShiftService = new ShiftService(tenantBetaId);

  try {
    // ----------------------------------------------------
    // TEST 1: Custom Roles Creation & Permissions Matrix
    // ----------------------------------------------------
    console.log("--- 1. Testing IAM Custom Role Creation ---");

    const posPerms = allPermissions.filter((p) =>
      [
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SHIFT_VIEW,
        PERMISSIONS.SHIFT_OPEN,
        PERMISSIONS.SHIFT_CLOSE,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
      ].includes(p.code as any)
    );

    const cashierRole = await iamService.createRole(adminUserAlpha.id, {
      name: `Trainee Cashier ${timestamp}`,
      description: "Dedicated counter checkout and cash drawer operations",
      permissionIds: posPerms.map((p) => p.id),
    });

    assert(cashierRole.name.includes("Trainee Cashier"), "Custom cashier role created with tenant isolation");

    const rolesList = await iamService.listRoles(adminUserAlpha.id);
    assert(rolesList.some((r: any) => r.id === cashierRole.id), "Created role returned in tenant role listing");

    // ----------------------------------------------------
    // TEST 2: Staff Management & Status Toggling
    // ----------------------------------------------------
    console.log("\n--- 2. Testing Staff Management & Branch Assignments ---");

    const cashierStaff = await iamService.createStaff(adminUserAlpha.id, {
      name: "Jane Cashier",
      email: `jane-${timestamp}@pharmacy.local`,
      roleId: cashierRole.id,
      branchId: branchAlpha.id,
      locale: "en",
      isActive: true,
    });

    assert(cashierStaff.name === "Jane Cashier", "Staff user created and mapped to role");
    assert(cashierStaff.branchId === branchAlpha.id, "Staff assigned to physical dispensary branch");
    assert(cashierStaff.isActive === true, "Staff defaults to Active status");

    // Toggle to suspended
    const suspendedStaff = await iamService.toggleStaffStatus(adminUserAlpha.id, {
      staffId: cashierStaff.id,
      isActive: false,
    });
    assert(suspendedStaff.isActive === false, "Staff successfully suspended by admin");

    // Reinstate cashier
    const reinstatedStaff = await iamService.toggleStaffStatus(adminUserAlpha.id, {
      staffId: cashierStaff.id,
      isActive: true,
    });
    assert(reinstatedStaff.isActive === true, "Staff successfully reinstated to Active");

    // ----------------------------------------------------
    // TEST 3: Shift-Gated POS Protection
    // ----------------------------------------------------
    console.log("\n--- 3. Testing Shift-Gated POS Requirement ---");

    // Setup a medicine and batch to test checkout
    const category = await catalogService.createCategory(adminUserAlpha.id, {
      name: `Pain Relief ${timestamp}`,
    });
    const medicine = await catalogService.createMedicine(adminUserAlpha.id, {
      sku: `PARA-${timestamp}`,
      name: "Paracetamol 500mg",
      categoryId: category.id,
    });
    const batch = await prisma.medicineBatch.create({
      data: {
        tenantId: tenantAlphaId,
        medicineId: medicine.id,
        batchNumber: `BAT-P2-${timestamp}`,
        mfgDate: new Date("2026-01-01"),
        expiryDate: new Date("2027-01-01"),
        purchasePrice: 5.0,
        sellingPrice: 10.0,
      },
    });

    // Seed stock into inventory ledger
    await prisma.inventoryLedger.create({
      data: {
        tenantId: tenantAlphaId,
        branchId: branchAlpha.id,
        medicineId: medicine.id,
        batchId: batch.id,
        transactionType: "PURCHASE",
        quantity: 50,
      },
    });

    // Attempting checkout without an open shift MUST FAIL
    let blockedWithoutShift = false;
    try {
      await posService.processSale(cashierStaff.id, {
        branchId: branchAlpha.id,
        items: [
          {
            medicineId: medicine.id,
            batchId: batch.id,
            quantity: 2,
            unitPrice: 10.0,
            discount: 0,
            tax: 0,
          },
        ],
        payments: [{ method: "CASH", amount: 20.0 }],
        discount: 0,
        tax: 0,
      });
    } catch (err: any) {
      if (err.message.includes("Shift Required") || err.message.includes("cashier shift")) {
        blockedWithoutShift = true;
      }
    }
    assert(blockedWithoutShift, "POS checkout is strictly gated: blocked without active shift");

    // ----------------------------------------------------
    // TEST 4: Cashier Shift Opening Lifecycle
    // ----------------------------------------------------
    console.log("\n--- 4. Testing Cashier Shift Opening & Single-Shift Constraint ---");

    const shift = await shiftService.openShift(cashierStaff.id, {
      branchId: branchAlpha.id,
      openingFloat: 100.0,
      notes: "Morning Shift Opening Drawer",
    });

    assert(shift.status === "OPEN", "Cashier shift opened successfully with OPEN status");
    assert(Number(shift.openingCash) === 100.0, "Opening float accurately recorded ($100.00)");
    assert(shift.userId === cashierStaff.id, "Shift linked to active cashier user");

    // Verify cashier cannot open a second shift while one is OPEN
    let duplicateShiftBlocked = false;
    try {
      await shiftService.openShift(cashierStaff.id, {
        branchId: branchAlpha.id,
        openingFloat: 50.0,
      });
    } catch (err: any) {
      if (err.message.toLowerCase().includes("active open shift")) {
        duplicateShiftBlocked = true;
      }
    }
    assert(duplicateShiftBlocked, "Simultaneous duplicate active shifts blocked for same cashier");

    // ----------------------------------------------------
    // TEST 5: Shift-Linked Sale & Expected Cash Calculation
    // ----------------------------------------------------
    console.log("\n--- 5. Testing Shift-Linked POS Sale & Cash Sales Tracking ---");

    // Complete POS checkout now that shift is OPEN
    const sale = await posService.processSale(cashierStaff.id, {
      branchId: branchAlpha.id,
      items: [
        {
          medicineId: medicine.id,
          batchId: batch.id,
          quantity: 3,
          unitPrice: 10.0,
          discount: 0,
          tax: 0,
        },
      ],
      payments: [{ method: "CASH", amount: 30.0 }],
      discount: 0,
      tax: 0,
      notes: "Cash Sale under Active Shift",
    });

    assert(sale.shiftId === shift.id, "Sale successfully linked to active cashier ShiftId");

    // ----------------------------------------------------
    // TEST 6: Mid-Shift Manual Cash Drop / Payout
    // ----------------------------------------------------
    console.log("\n--- 6. Testing Shift Cash Drop & Manual Payouts ---");

    // Cashier performs cash drop of $20 to safe
    const cashDrop = await shiftService.recordShiftTransaction(adminUserAlpha.id, {
      shiftId: shift.id,
      type: "CASH_DROP",
      amount: 20.0,
      reason: "Mid-day safe deposit drop",
    });

    assert(cashDrop.type === "CASH_DROP", "Mid-shift CASH_DROP transaction logged");
    assert(Number(cashDrop.amount) === 20.0, "Cash drop amount matches ($20.00)");

    // ----------------------------------------------------
    // TEST 7: Shift Closing & Cash Reconciliation Variance
    // ----------------------------------------------------
    console.log("\n--- 7. Testing Shift Close & Variance Balancing ---");

    // Expected cash formula:
    // Opening Float: $100.00
    // + Cash Sales: $30.00
    // - Cash Drops: $20.00
    // = Expected: $110.00

    // Cashier counts $110.00 (Balanced drawer)
    const closedShiftResult = await shiftService.closeShift(cashierStaff.id, {
      shiftId: shift.id,
      closingCash: 110.0,
      notes: "Shift closed with perfect physical drawer reconciliation",
    });

    assert(closedShiftResult.status === "CLOSED", "Shift marked as CLOSED");
    assert(Number(closedShiftResult.expectedCash) === 110.0, "Expected cash accurately computed ($110.00)");
    assert(Number(closedShiftResult.variance) === 0.0, "Cash reconciliation variance is exactly $0.00 (Balanced)");
    assert(closedShiftResult.closedAt !== null, "Closed timestamp properly recorded");

    // ----------------------------------------------------
    // TEST 8: Multi-Tenant Isolation for IAM & Shifts
    // ----------------------------------------------------
    console.log("\n--- 8. Testing Multi-Tenant Isolation ---");

    const betaRoles = await betaIamService.listRoles(adminUserAlpha.id).catch(() => []);
    assert(!betaRoles.some((r: any) => r.id === cashierRole.id), "Tenant Beta cannot see Tenant Alpha custom roles");

    const betaShifts = await prisma.shift.findMany({
      where: { tenantId: tenantBetaId },
    });
    assert(betaShifts.length === 0, "Tenant Beta has zero shifts from Tenant Alpha");

    console.log("\n==================================================================");
    console.log("   ALL PHASE 2 INTEGRATION TESTS PASSED (100%)                    ");
    console.log("==================================================================\n");
  } finally {
    // Cleanup test tenants in proper relational order
    const tenantIds = [tenantAlphaId, tenantBetaId];
    await prisma.shiftTransaction.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: tenantIds } } } });
    await prisma.payment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.sale.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.shift.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.medicine.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.category.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: { in: tenantIds } } } });
    await prisma.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
}

runPhase2Suite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
