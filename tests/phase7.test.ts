import { prisma } from "../lib/db/prisma";
import { NotificationService, notifyAsync } from "../services/notification.service";
import { MigrationService } from "../services/migration.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { parseCsv } from "../lib/utils/csv-parser";
import { exportToCsv } from "../lib/utils/csv-exporter";
import {
  NotificationType,
  ImportEntity,
  ImportStatus,
  TenantStatus,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase7Tests() {
  console.log("==================================================================");
  console.log("   PHASE 7 TEST SUITE: NOTIFICATIONS ENGINE & DATA MIGRATION     ");
  console.log("==================================================================");

  const tenantAlphaId = "tenant-alpha-phase7";
  const tenantBetaId = "tenant-beta-phase7";
  const branchAlphaId = "branch-alpha-phase7";
  const userAlphaId = "user-alpha-phase7";
  const userBetaId = "user-beta-phase7";
  const roleAdminId = "role-admin-phase7";

  try {
    // Cleanup any lingering records
    await prisma.dataImportJob.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.notification.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.medicine.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.role.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });

    // Seed Tenants
    await prisma.tenant.create({
      data: {
        id: tenantAlphaId,
        name: "Alpha Pharmacy Phase 7",
        slug: "alpha-p7",
        status: TenantStatus.ACTIVE,
      },
    });

    await prisma.tenant.create({
      data: {
        id: tenantBetaId,
        name: "Beta Pharmacy Phase 7",
        slug: "beta-p7",
        status: TenantStatus.ACTIVE,
      },
    });

    // Seed Branch
    await prisma.branch.create({
      data: {
        id: branchAlphaId,
        tenantId: tenantAlphaId,
        name: "Alpha Main",
        code: "ALPHA-01",
      },
    });

    // Seed Roles & Users
    const role = await prisma.role.create({
      data: {
        id: roleAdminId,
        tenantId: tenantAlphaId,
        name: "Pharmacy Admin",
      },
    });

    await prisma.pharmacyUser.create({
      data: {
        id: userAlphaId,
        tenantId: tenantAlphaId,
        hubUserId: "hub-alpha-p7",
        roleId: role.id,
        branchId: branchAlphaId,
        name: "Dr. Alpha Admin",
        email: "admin@alpha-p7.local",
      },
    });

    await prisma.pharmacyUser.create({
      data: {
        id: userBetaId,
        tenantId: tenantBetaId,
        hubUserId: "hub-beta-p7",
        roleId: role.id,
        name: "Dr. Beta Admin",
        email: "admin@beta-p7.local",
      },
    });

    // Seed Category
    const category = await prisma.category.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Cardiovascular",
      },
    });

    // ============================================================================
    // TEST 1: AUTOMATED THRESHOLD ENGINE & LOW STOCK ALERTS
    // ============================================================================
    console.log("\n--- 1. Testing Automated Threshold Engine & Low Stock Alerts ---");

    const medicine = await prisma.medicine.create({
      data: {
        tenantId: tenantAlphaId,
        categoryId: category.id,
        sku: "MED-ATV-20",
        name: "Atorvastatin 20mg",
        minStockLevel: 50,
        maxStockLevel: 500,
        reorderLevel: 75,
      },
    });

    const notifServiceAlpha = new NotificationService(tenantAlphaId);

    // Initial state: 100 units in stock (> 50 minStockLevel)
    const batch = await prisma.medicineBatch.create({
      data: {
        tenantId: tenantAlphaId,
        medicineId: medicine.id,
        batchNumber: "BAT-ATV-01",
        purchasePrice: 10.0,
        sellingPrice: 15.0,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Inflow 100 units via InventoryLedger
    await prisma.inventoryLedger.create({
      data: {
        tenantId: tenantAlphaId,
        branchId: branchAlphaId,
        medicineId: medicine.id,
        batchId: batch.id,
        transactionType: "PURCHASE",
        quantity: 100,
        notes: "Initial stock procurement",
      },
    });

    const alertHigh = await notifServiceAlpha.evaluateStockLevels(medicine.id);
    assert(alertHigh === null, "No alert triggered when stock (100) is above minimum threshold (50)");

    // Deduct 75 units via InventoryLedger (remaining stock: 25 < 50 minStockLevel)
    await prisma.inventoryLedger.create({
      data: {
        tenantId: tenantAlphaId,
        branchId: branchAlphaId,
        medicineId: medicine.id,
        batchId: batch.id,
        transactionType: "SALE",
        quantity: -75,
        notes: "Dispensed sales checkout",
      },
    });

    const alertLow = await notifServiceAlpha.evaluateStockLevels(medicine.id);
    assert(alertLow !== null, "LOW_STOCK alert generated when stock (25) dips below threshold (50)");
    assert(alertLow?.type === NotificationType.LOW_STOCK, "Notification type is LOW_STOCK");
    assert(alertLow?.referenceId === medicine.id, "Alert referenceId matches medicine id");

    // Test alert suppression (duplicate alert within 24h should be suppressed)
    const alertSuppressed = await notifServiceAlpha.evaluateStockLevels(medicine.id);
    assert(alertSuppressed === null, "Alert fatigue prevented: repeated check within suppression window returns null");

    // ============================================================================
    // TEST 2: IN-APP NOTIFICATION CENTER & READ STATUS
    // ============================================================================
    console.log("\n--- 2. Testing In-App Notification Center Operations ---");

    // Broadcast a compliance alert
    await notifServiceAlpha.broadcast(
      NotificationType.COMPLIANCE,
      "License Expiry Imminent",
      "Narcotic Dispensing Permit expires in 45 days.",
      "LIC-NARCOTIC-01",
      userAlphaId
    );

    const list = await notifServiceAlpha.listNotifications(userAlphaId);
    assert(list.total === 2, "Retrieved 2 notifications for Alpha user");
    assert(list.unreadCount === 2, "Both notifications are initially unread (unreadCount: 2)");

    // Mark single notification as read
    const markReadResult = await notifServiceAlpha.markAsRead(alertLow!.id, userAlphaId);
    assert(markReadResult?.isRead === true, "Single notification marked as read");

    const countAfterOne = await notifServiceAlpha.getUnreadCount(userAlphaId);
    assert(countAfterOne === 1, "Unread count decreased to 1");

    // Mark all as read
    await notifServiceAlpha.markAllAsRead(userAlphaId);
    const countAfterAll = await notifServiceAlpha.getUnreadCount(userAlphaId);
    assert(countAfterAll === 0, "Mark all as read reduced unreadCount to 0");

    // ============================================================================
    // TEST 3: BULK CSV DATA IMPORT & IDEMPOTENT UPSERT PIPELINE
    // ============================================================================
    console.log("\n--- 3. Testing Bulk CSV Data Import & Idempotent Upsert ---");

    const migrationServiceAlpha = new MigrationService(tenantAlphaId);

    const initialCsv =
      "sku,name,category,strength,unitOfMeasure,minStockLevel,maxStockLevel,reorderPoint,isControlled,regulatorySchedule,isNarcotic,requiresPrescription\r\n" +
      "MED-AMOX-500,Amoxicillin 500mg,Antibiotics,500mg,CAPSULE,30,300,60,false,,false,true\r\n" +
      "MED-OXY-020,Oxycodone 20mg,Analgesics,20mg,TABLET,15,150,30,true,Schedule II,true,true\r\n" +
      "MED-IBU-400,Ibuprofen 400mg,Analgesics,400mg,TABLET,50,500,100,false,,false,false\r\n";

    const job1 = await migrationServiceAlpha.processCsvImport({
      userId: userAlphaId,
      entity: ImportEntity.MEDICINE,
      csvContent: initialCsv,
    });

    assert(job1.status === ImportStatus.COMPLETED, "Import Job 1 completed successfully");
    assert(job1.totalRows === 3, "Import Job 1 totalRows === 3");
    assert(job1.successRows === 3, "Import Job 1 successRows === 3");
    assert(job1.failedRows === 0, "Import Job 1 failedRows === 0");

    // Verify records created
    const countAfterJob1 = await prisma.medicine.count({ where: { tenantId: tenantAlphaId } });
    assert(countAfterJob1 === 4, "Total medicines under Alpha is 4 (1 seeded + 3 imported)");

    const oxy = await prisma.medicine.findFirst({
      where: { tenantId: tenantAlphaId, sku: "MED-OXY-020" },
    });
    assert(oxy?.isControlled === true, "Controlled substance flag correctly ingested as true");
    assert(oxy?.regulatorySchedule === "Schedule II", "Regulatory schedule correctly ingested as Schedule II");

    // Test Idempotency: Re-uploading the EXACT SAME CSV with updated attributes
    console.log("\n--- Testing Idempotency (Re-uploading without duplication) ---");

    const updatedCsv =
      "sku,name,category,strength,unitOfMeasure,minStockLevel,maxStockLevel,reorderPoint,isControlled,regulatorySchedule,isNarcotic,requiresPrescription\r\n" +
      "MED-AMOX-500,Amoxicillin Trihydrate 500mg,Antibiotics,500mg,CAPSULE,40,400,80,false,,false,true\r\n" +
      "MED-OXY-020,Oxycodone HCl 20mg,Analgesics,20mg,TABLET,25,250,50,true,Schedule II,true,true\r\n" +
      "MED-IBU-400,Ibuprofen Rapid 400mg,Analgesics,400mg,TABLET,60,600,120,false,,false,false\r\n";

    const job2 = await migrationServiceAlpha.processCsvImport({
      userId: userAlphaId,
      entity: ImportEntity.MEDICINE,
      csvContent: updatedCsv,
    });

    assert(job2.status === ImportStatus.COMPLETED, "Import Job 2 completed without duplicate key errors");
    assert(job2.successRows === 3, "Import Job 2 updated all 3 rows successfully");

    const countAfterJob2 = await prisma.medicine.count({ where: { tenantId: tenantAlphaId } });
    assert(countAfterJob2 === 4, "Zero duplicates created: Total medicines remains exactly 4");

    const updatedAmox = await prisma.medicine.findFirst({
      where: { tenantId: tenantAlphaId, sku: "MED-AMOX-500" },
    });
    assert(
      updatedAmox?.name === "Amoxicillin Trihydrate 500mg",
      "Medicine name idempotently updated in database"
    );
    assert(updatedAmox?.minStockLevel === 40, "Medicine minStockLevel idempotently updated to 40");

    // Test Error Handling with malformed row (missing SKU)
    const malformedCsv =
      "sku,name,category\r\n" +
      ",Missing Sku Medicine,General\r\n";

    const job3 = await migrationServiceAlpha.processCsvImport({
      userId: userAlphaId,
      entity: ImportEntity.MEDICINE,
      csvContent: malformedCsv,
    });

    assert(job3.failedRows === 1, "Malformed row correctly caught and tracked as failed");
    const errors = job3.errorLog as any[];
    assert(errors.length > 0, "Error log captured row number and error description");
    assert(errors[0].error.includes("sku"), "Error specifically identifies missing sku");

    // ============================================================================
    // TEST 4: STANDARDIZED CSV EXPORT WRAPPER
    // ============================================================================
    console.log("\n--- 4. Testing Standardized CSV Export Wrapper ---");

    const sampleData = [
      { sku: "MED-01", name: 'Aspirin 100mg, "Chewable"', price: 12.5 },
      { sku: "MED-02", name: "Vitamin C", price: 8.0 },
    ];

    const exportedCsv = exportToCsv(sampleData);
    assert(exportedCsv.includes("sku,name,price"), "CSV contains headers");
    assert(
      exportedCsv.includes('"Aspirin 100mg, ""Chewable"""'),
      "CSV escaping properly handled commas and double quotes according to RFC 4180"
    );

    // ============================================================================
    // TEST 5: MULTI-TENANT COMPLIANCE & MIGRATION ISOLATION
    // ============================================================================
    console.log("\n--- 5. Testing Multi-Tenant Migration & Notification Isolation ---");

    const notifServiceBeta = new NotificationService(tenantBetaId);
    const betaNotifs = await notifServiceBeta.listNotifications(userBetaId);
    assert(betaNotifs.total === 0, "Tenant Beta cannot see Tenant Alpha's notifications (Total: 0)");

    const migrationServiceBeta = new MigrationService(tenantBetaId);
    const betaJobs = await migrationServiceBeta.listImportJobs();
    assert(betaJobs.length === 0, "Tenant Beta cannot see Tenant Alpha's import jobs (Total: 0)");

    const betaMedicines = await prisma.medicine.count({ where: { tenantId: tenantBetaId } });
    assert(betaMedicines === 0, "Tenant Beta cannot see Tenant Alpha's imported medicines (Total: 0)");

    // Cleanup
    await prisma.dataImportJob.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.notification.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.medicine.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.role.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });

    console.log("\n==================================================================");
    console.log("   ALL PHASE 7 TESTS PASSED (100%)                                ");
    console.log("==================================================================");
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  }
}

runPhase7Tests();
