import { prisma } from "../lib/db/prisma";
import { ReportsService } from "../services/reports.service";
import { PERMISSIONS } from "../lib/permissions/permissions";
import {
  PaymentMethod,
  PaymentType,
  SaleStatus,
  ShiftStatus,
  ShiftTransactionType,
  PrescriptionStatus,
  Prisma,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase5Suite() {
  console.log("\n==================================================================");
  console.log("   PHASE 5 INTEGRATION TEST SUITE: REPORTS & ANALYTICS           ");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const tenantAlphaId = `tenant-p5-alpha-${timestamp}`;
  const tenantBetaId = `tenant-p5-beta-${timestamp}`;

  // 1. Provision isolated test tenants
  await prisma.tenant.createMany({
    data: [
      { id: tenantAlphaId, name: "Alpha Analytics Pharmacy", slug: `alpha-p5-${timestamp}` },
      { id: tenantBetaId, name: "Beta Analytics Pharmacy", slug: `beta-p5-${timestamp}` },
    ],
  });

  // 2. Fetch or seed permissions
  const allPermissions = await prisma.permission.findMany();
  const reportsViewPerm = allPermissions.find((p) => p.code === PERMISSIONS.REPORTS_VIEW);
  assert(reportsViewPerm !== undefined, "REPORTS_VIEW permission registered in system");

  // 3. Provision Admin Role & User
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Pharmacy Executive",
      isSystem: false,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: adminRole.id,
      permissionId: p.id,
    })),
  });

  const branchAlpha = await prisma.branch.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Alpha Main Dispensary",
      code: `DISP-${timestamp.toString().slice(-4)}`,
    },
  });

  const execUser = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-exec-${timestamp}`,
      roleId: adminRole.id,
      branchId: branchAlpha.id,
      name: "Dr. Eleanor Vance, Executive",
      email: `exec-${timestamp}@alphapharm.local`,
    },
  });

  const reportsServiceAlpha = new ReportsService(tenantAlphaId);
  const reportsServiceBeta = new ReportsService(tenantBetaId);

  // Setup Catalog: Category & Medicines
  const category = await prisma.category.create({
    data: {
      tenantId: tenantAlphaId,
      name: `Analgesics-${timestamp}`,
    },
  });

  const medFastMoving = await prisma.medicine.create({
    data: {
      tenantId: tenantAlphaId,
      categoryId: category.id,
      name: "Paracetamol Clinical 500mg",
      sku: `PARA-${timestamp}`,
      strength: "500mg",
      isPrescriptionRequired: false,
    },
  });

  const medDeadStock = await prisma.medicine.create({
    data: {
      tenantId: tenantAlphaId,
      categoryId: category.id,
      name: "Rare Antidote Solution 100ml",
      sku: `ANTI-${timestamp}`,
      strength: "100ml",
      isPrescriptionRequired: true,
    },
  });

  // Setup Batches:
  // 1. medFastMoving: Active stock, safe expiry
  const now = new Date();
  const batchFast = await prisma.medicineBatch.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medFastMoving.id,
      batchNumber: `BATCH-FAST-${timestamp}`,
      purchasePrice: 2.0,
      sellingPrice: 5.0,
      expiryDate: new Date(now.getTime() + 180 * 86400000), // Safe (180 days)
    },
  });

  await prisma.inventoryLedger.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medFastMoving.id,
      batchId: batchFast.id,
      branchId: branchAlpha.id,
      transactionType: "PURCHASE",
      quantity: 100,
    },
  });

  // 2. medDeadStock: Expired Batch
  const batchExpired = await prisma.medicineBatch.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medDeadStock.id,
      batchNumber: `BATCH-EXP-${timestamp}`,
      purchasePrice: 25.0, // $250 cost loss
      sellingPrice: 60.0,
      expiryDate: new Date(now.getTime() - 10 * 86400000), // Expired 10 days ago
    },
  });

  await prisma.inventoryLedger.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medDeadStock.id,
      batchId: batchExpired.id,
      branchId: branchAlpha.id,
      transactionType: "PURCHASE",
      quantity: 10,
    },
  });

  // 3. medDeadStock: Expiring Soon Batch (within 45 days)
  const batchExpiringSoon = await prisma.medicineBatch.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medDeadStock.id,
      batchNumber: `BATCH-SOON-${timestamp}`,
      purchasePrice: 20.0, // $400 at risk
      sellingPrice: 50.0,
      expiryDate: new Date(now.getTime() + 45 * 86400000), // Expiring in 45 days
    },
  });

  await prisma.inventoryLedger.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medDeadStock.id,
      batchId: batchExpiringSoon.id,
      branchId: branchAlpha.id,
      transactionType: "PURCHASE",
      quantity: 20,
    },
  });

  // ============================================================================
  // TEST 1: FINANCIAL & SALES REVENUE ANALYTICS
  // ============================================================================
  console.log("\n--- 1. Testing Financial & Sales Revenue Aggregation ---");

  // Create a completed sale: 5 units of Paracetamol @ $5.00 = $25.00, discount $2.00, tax $1.50 => total $24.50
  const sale1 = await prisma.sale.create({
    data: {
      tenantId: tenantAlphaId,
      branchId: branchAlpha.id,
      userId: execUser.id,
      receiptNumber: `REC-SALES-${timestamp.toString().slice(-4)}`,
      subtotal: 25.0,
      discount: 2.0,
      tax: 1.5,
      totalAmount: 24.5,
      paidAmount: 24.5,
      status: SaleStatus.COMPLETED,
      saleDate: new Date(),
    },
  });

  await prisma.saleItem.create({
    data: {
      saleId: sale1.id,
      medicineId: medFastMoving.id,
      batchId: batchFast.id,
      quantity: 5,
      unitPrice: 5.0,
      subtotal: 25.0,
    },
  });

  await prisma.payment.create({
    data: {
      tenantId: tenantAlphaId,
      saleId: sale1.id,
      type: PaymentType.CUSTOMER_RECEIPT,
      method: PaymentMethod.CASH,
      amount: 24.5,
      recordedById: execUser.id,
      date: new Date(),
    },
  });

  const salesReport = await reportsServiceAlpha.getSalesReport({
    startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  assert(salesReport.summary.totalRevenue === 24.5, "Sales report total revenue matches $24.50");
  assert(salesReport.summary.totalDiscount === 2.0, "Total discounts accurately aggregated ($2.00)");
  assert(salesReport.summary.totalTax === 1.5, "Total clinical tax aggregated ($1.50)");
  assert(salesReport.summary.salesCount === 1, "Completed invoice count equals 1");
  assert(salesReport.byPaymentMethod.length >= 1, "Payment method breakdown generated");
  assert(salesReport.byPaymentMethod.some((p: any) => p.method === "CASH" && p.totalAmount === 24.5), "Cash channel recorded accurately");
  assert(salesReport.timeline.length >= 1, "Daily timeline array contains sales points");

  // ============================================================================
  // TEST 2: INVENTORY CAPITAL VALUATION & EXPIRY SURVEILLANCE
  // ============================================================================
  console.log("\n--- 2. Testing Inventory Valuation & Expiry Surveillance ---");

  // Total Capital Valuation:
  // batchFast: 100 * $2.00 = $200.00
  // batchExpired: 10 * $25.00 = $250.00
  // batchExpiringSoon: 20 * $20.00 = $400.00
  // Total Valuation = $850.00
  const valuation = await reportsServiceAlpha.getInventoryValuation({});

  assert(valuation.summary.totalValuation === 850.0, "Total inventory purchasing capital evaluated at $850.00");
  assert(valuation.summary.totalUnitsInStock === 130, "Total physical units in stock evaluated at 130");
  assert(valuation.topValuedBatches.length === 3, "Top valued batches table returned 3 active batches");
  assert(valuation.categoryBreakdown.length >= 1, "Category allocation generated");

  // Expiry Surveillance (90 day window)
  const expiry = await reportsServiceAlpha.getInventoryExpiry({ days: 90 });

  assert(expiry.summary.expiredCount === 1, "Detected exactly 1 expired batch");
  assert(expiry.summary.expiredCapital === 250.0, "Expired capital loss evaluated at $250.00");
  assert(expiry.summary.expiringSoonCount === 1, "Detected exactly 1 batch expiring within 90 days");
  assert(expiry.summary.expiringSoonCapital === 400.0, "At-risk capital expiring soon evaluated at $400.00");
  assert(expiry.summary.totalAtRiskCapital === 650.0, "Total at-risk capital accurately computed ($650.00)");

  // ============================================================================
  // TEST 3: INVENTORY MOVEMENT (FAST-MOVING VS DEAD STOCK)
  // ============================================================================
  console.log("\n--- 3. Testing Velocity Analysis: Fast-Moving & Dead Stock ---");

  const movement = await reportsServiceAlpha.getInventoryMovement({
    fastMovingDays: 30,
    deadStockDays: 90,
    limit: 10,
  });

  assert(movement.fastMoving.length >= 1, "Fast-moving list contains active sellers");
  assert(movement.fastMoving[0].medicineId === medFastMoving.id, "Paracetamol identified as top velocity medication");
  assert(movement.fastMoving[0].totalQuantitySold === 5, "Paracetamol sold 5 units");

  assert(movement.deadStock.length >= 1, "Dead stock list contains unsorted medications");
  assert(movement.deadStock.some((d: any) => d.medicineId === medDeadStock.id), "Rare Antidote identified as Dead Stock (0 sales)");
  assert(movement.summary.totalDeadStockCapital >= 650.0, "Dead stock capital trapped evaluated accurately");

  // ============================================================================
  // TEST 4: SHIFT & CASHIER RECONCILIATION (END-OF-DAY)
  // ============================================================================
  console.log("\n--- 4. Testing End-of-Day (EOD) Shift Reconciliation ---");

  // Create and close a shift with cash shortage
  const shift = await prisma.shift.create({
    data: {
      tenantId: tenantAlphaId,
      branchId: branchAlpha.id,
      userId: execUser.id,
      openingCash: 100.0,
      expectedCash: 124.5, // 100 float + 24.5 cash sale
      closingCash: 110.0,  // Shortage of $14.50
      variance: -14.5,
      status: ShiftStatus.CLOSED,
      openedAt: new Date(Date.now() - 8 * 3600000),
      closedAt: new Date(),
    },
  });

  // Link safe drop
  await prisma.shiftTransaction.create({
    data: {
      tenantId: tenantAlphaId,
      shiftId: shift.id,
      type: ShiftTransactionType.CASH_DROP,
      amount: 50.0,
      reason: "Midday safe drop",
    },
  });

  const shiftReport = await reportsServiceAlpha.getShiftReconciliation({
    startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  assert(shiftReport.summary.totalShifts >= 1, "Shift reconciliation audited closed shift");
  assert(shiftReport.summary.shortageCount >= 1, "Shortage shift identified");
  const auditedShift = shiftReport.shifts.find((s: any) => s.id === shift.id);
  assert(auditedShift !== undefined, "Target shift found in audit report");
  assert(auditedShift?.status === "SHORTAGE", "Audit status flagged as SHORTAGE");
  assert(Math.round((auditedShift?.variance ?? 0) * 100) / 100 === -14.5, "Variance calculated at -$14.50 shortage");
  assert(auditedShift?.totalDrops === 50.0, "Mid-shift safe drop of $50.00 registered");

  // ============================================================================
  // TEST 5: CLINICAL & DISPENSING ANALYTICS
  // ============================================================================
  console.log("\n--- 5. Testing Clinical & Dispensing Analytics ---");

  const doctor = await prisma.doctor.create({
    data: {
      tenantId: tenantAlphaId,
      name: `Dr. Gregory House ${timestamp}`,
      specialization: "Diagnostics & Pharmacology",
      licenseNumber: `DOC-LIC-${timestamp.toString().slice(-4)}`,
      hospitalAffiliation: "Princeton-Plainsboro Hospital",
    },
  });

  const patient = await prisma.patient.create({
    data: {
      tenantId: tenantAlphaId,
      name: `John Doe ${timestamp}`,
      dob: new Date("1985-06-15"),
      gender: "Male",
    },
  });

  const rx = await prisma.prescription.create({
    data: {
      tenantId: tenantAlphaId,
      patientId: patient.id,
      doctorId: doctor.id,
      verifiedById: execUser.id,
      prescriptionNumber: `RX-CLIN-${timestamp.toString().slice(-4)}`,
      status: PrescriptionStatus.DISPENSED,
      prescriptionDate: new Date(),
      verifiedAt: new Date(),
    },
  });

  const clinical = await reportsServiceAlpha.getClinicalAnalytics({
    startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  assert(clinical.summary.totalPrescriptions >= 1, "Prescription counted in clinical analytics");
  assert(clinical.summary.dispensedPrescriptions >= 1, "Dispensed prescription registered");
  assert(clinical.summary.verificationRate === 100.0, "Clinical verification rate is 100%");
  assert(clinical.topDoctors.length >= 1, "Doctor leaderboard generated");
  assert(clinical.topDoctors[0].doctorName.includes("Gregory House"), "Dr. Gregory House leads prescriber volume");

  // ============================================================================
  // TEST 6: STRICT MULTI-TENANCY ISOLATION
  // ============================================================================
  console.log("\n--- 6. Testing Multi-Tenant Analytical Data Isolation ---");

  const betaSales = await reportsServiceBeta.getSalesReport({
    startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  assert(betaSales.summary.totalRevenue === 0, "Tenant Beta sales revenue is strictly isolated ($0.00)");
  assert(betaSales.summary.salesCount === 0, "Tenant Beta invoice count is strictly 0");

  const betaValuation = await reportsServiceBeta.getInventoryValuation({});
  assert(betaValuation.summary.totalValuation === 0, "Tenant Beta capital valuation is strictly $0.00");

  const betaExpiry = await reportsServiceBeta.getInventoryExpiry({ days: 90 });
  assert(betaExpiry.summary.expiredCount === 0, "Tenant Beta expired count is strictly 0");

  const betaShifts = await reportsServiceBeta.getShiftReconciliation({
    startDate: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  assert(betaShifts.summary.totalShifts === 0, "Tenant Beta shift count is strictly 0");

  // Cleanup test fixtures
  await prisma.shiftTransaction.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.shift.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.prescription.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.doctor.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.patient.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.payment.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.inventoryLedger.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.medicine.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.rolePermission.deleteMany({ where: { role: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } } });
  await prisma.role.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
  await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });

  console.log("\n==================================================================");
  console.log("   ALL PHASE 5 REPORTS & ANALYTICS TESTS PASSED (100%)            ");
  console.log("==================================================================\n");
}

runPhase5Suite()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
