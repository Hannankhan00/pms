import { prisma } from "../lib/db/prisma";
import { tenantDb } from "../lib/tenant/tenant-db";
import { CatalogService } from "../services/catalog.service";
import { ProcurementService } from "../services/procurement.service";
import { InventoryService } from "../services/inventory.service";
import { PosService } from "../services/pos.service";
import { ShiftService } from "../services/shift.service";
import { PERMISSIONS } from "../lib/permissions/permissions";
import { InventoryTransactionType } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase1Suite() {
  console.log("\n=======================================================");
  console.log("   PHASE 1 INTEGRATION TEST SUITE: CLINICAL PRECISION   ");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const tenantAlphaId = `tenant-p1-alpha-${timestamp}`;
  const tenantBetaId = `tenant-p1-beta-${timestamp}`;

  // 1. Setup isolated test tenants
  await prisma.tenant.createMany({
    data: [
      { id: tenantAlphaId, name: "Pharmacy Alpha P1", slug: `alpha-p1-${timestamp}` },
      { id: tenantBetaId, name: "Pharmacy Beta P1", slug: `beta-p1-${timestamp}` },
    ],
  });

  // Seed super-admin role & user for Alpha
  const roleAlpha = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Admin Alpha",
      isSystem: true,
    },
  });

  // Grant all permissions to roleAlpha
  const allPerms = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: allPerms.map((p) => ({
      roleId: roleAlpha.id,
      permissionId: p.id,
    })),
  });

  const userAlpha = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-alpha-${timestamp}`,
      roleId: roleAlpha.id,
      name: "Dr. Alpha Pharmacist",
      email: `alpha-${timestamp}@pharmacy.local`,
    },
  });

  // Create branch for Alpha
  const branchAlpha = await prisma.branch.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Alpha Main Dispensary",
      code: `DISP-${timestamp}`,
    },
  });

  // Initialize service instances scoped to tenantAlpha
  const catalogService = new CatalogService(tenantAlphaId);
  const procurementService = new ProcurementService(tenantAlphaId);
  const inventoryService = new InventoryService(tenantAlphaId);
  const posService = new PosService(tenantAlphaId);

  // Initialize service for tenantBeta to verify isolation
  const betaCatalogService = new CatalogService(tenantBetaId);
  const betaInventoryService = new InventoryService(tenantBetaId);

  try {
    // ----------------------------------------------------
    // TEST 1: Catalog Module & Multilingual Taxonomy
    // ----------------------------------------------------
    console.log("--- 1. Testing Catalog Master & Multilingual Support ---");

    const category = await catalogService.createCategory(userAlpha.id, {
      name: "Antibiotics",
      nameAr: "مضادات حيوية",
      nameFr: "Antibiotiques",
      nameIt: "Antibiotici",
      description: "Broad spectrum antibiotics",
    });
    assert(category.name === "Antibiotics", "Category created with primary name");
    assert(category.nameAr === "مضادات حيوية", "Category created with Arabic name");

    const dosageForm = await catalogService.createDosageForm(userAlpha.id, {
      name: "Oral Capsule",
      nameAr: "كبسولات فموية",
      nameFr: "Gélule Orale",
      nameIt: "Capsula Orale",
    });
    assert(dosageForm.name === "Oral Capsule", "Dosage form created successfully");

    const medicine = await catalogService.createMedicine(userAlpha.id, {
      sku: `AMOX-500-${timestamp}`,
      barcode: `8901234567${timestamp.toString().slice(-4)}`,
      name: "Amoxicillin 500mg",
      nameAr: "أموكسيسيلين 500 مجم",
      nameFr: "Amoxicilline 500mg",
      nameIt: "Amoxicillina 500mg",
      categoryId: category.id,
      dosageFormId: dosageForm.id,
      strength: "500mg",
      reorderLevel: 20,
      isPrescriptionRequired: true,
      isNarcotic: false,
    });

    assert(medicine.sku.startsWith("AMOX-500"), "Medicine created with unique SKU");
    assert(medicine.isPrescriptionRequired === true, "Rx Required flag set correctly");

    // Verify tenant isolation in catalog
    const betaMedicines = await betaCatalogService.listMedicines();
    assert(
      !betaMedicines.items.some((m: any) => m.id === medicine.id),
      "Tenant Beta CANNOT see Tenant Alpha's medicine in catalog"
    );

    // ----------------------------------------------------
    // TEST 2: Procurement & Double-Entry Inbound Intake
    // ----------------------------------------------------
    console.log("\n--- 2. Testing Procurement & Stock Inflow ---");

    const supplier = await procurementService.createSupplier(userAlpha.id, {
      name: `PharmaCorp Global ${timestamp}`,
      contactPerson: "Jane Doe",
      email: `supply-${timestamp}@pharmacorp.com`,
      phone: "+1-555-0199",
    });
    assert(supplier.name.includes("PharmaCorp"), "Supplier created under tenant");

    // We record a purchase with 2 batches with different expiry dates to test FEFO later:
    // Batch 1: Expiring earlier (in 6 months)
    // Batch 2: Expiring later (in 18 months)
    const earlyExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const lateExpiry = new Date(Date.now() + 540 * 24 * 60 * 60 * 1000);

    const purchase = await procurementService.createPurchase(userAlpha.id, {
      supplierId: supplier.id,
      branchId: branchAlpha.id,
      invoiceNumber: `INV-PO-${timestamp}`,
      purchaseDate: new Date(),
      items: [
        {
          medicineId: medicine.id,
          batchNumber: `BATCH-EARLY-${timestamp}`,
          expiryDate: earlyExpiry,
          quantity: 100,
          unitPrice: 12.5,
          sellingPrice: 18.0,
          tax: 0,
        },
        {
          medicineId: medicine.id,
          batchNumber: `BATCH-LATE-${timestamp}`,
          expiryDate: lateExpiry,
          quantity: 200,
          unitPrice: 12.0,
          sellingPrice: 18.0,
          tax: 0,
        },
      ],
    });

    assert(purchase.status === "RECEIVED", "Purchase order status is RECEIVED (Inflow stock committed)");

    // ----------------------------------------------------
    // TEST 3: Double-Entry Inventory Ledger Verification
    // ----------------------------------------------------
    console.log("\n--- 3. Verifying Inventory Ledger Inflow & Balances ---");

    const ledgerHistory = await inventoryService.listLedger({
      medicineId: medicine.id,
    });

    assert(ledgerHistory.total === 2, "Inventory ledger contains exactly 2 purchase entries");
    assert(
      ledgerHistory.items.every(
        (e: any) => e.transactionType === InventoryTransactionType.PURCHASE
      ),
      "All entries are verified as PURCHASE transactionType"
    );

    // Retrieve created batches
    const alphaDb = tenantDb(tenantAlphaId);
    const earlyBatch = await alphaDb.medicineBatch.findFirst({
      where: { batchNumber: `BATCH-EARLY-${timestamp}` },
    });
    const lateBatch = await alphaDb.medicineBatch.findFirst({
      where: { batchNumber: `BATCH-LATE-${timestamp}` },
    });

    assert(earlyBatch !== null, "Early expiry batch created in database");
    assert(lateBatch !== null, "Late expiry batch created in database");

    // Real-time double-entry stock balance checks
    const earlyStock = await inventoryService.getBatchBalance(earlyBatch!.id, branchAlpha.id);
    const lateStock = await inventoryService.getBatchBalance(lateBatch!.id, branchAlpha.id);
    const totalMedicineStock = await inventoryService.getMedicineStock(medicine.id, branchAlpha.id);

    assert(earlyStock === 100, "Early batch balance equals 100 units");
    assert(lateStock === 200, "Late batch balance equals 200 units");
    assert(totalMedicineStock === 300, "Total medicine aggregated stock balance equals 300 units");

    // Verify Beta cannot read Alpha's batch balance
    let threwBetaIsolation = false;
    try {
      const betaStock = await betaInventoryService.getBatchBalance(earlyBatch!.id);
      if (betaStock === 0) threwBetaIsolation = true; // Returns 0 because query is tenant-scoped
    } catch {
      threwBetaIsolation = true;
    }
    assert(threwBetaIsolation, "Tenant Beta cannot see Tenant Alpha's batch stock");

    // ----------------------------------------------------
    // TEST 4: FEFO (First-Expiry-First-Out) Ordering
    // ----------------------------------------------------
    console.log("\n--- 4. Testing FEFO (First-Expiry-First-Out) Algorithm ---");

    const fefoBatches = await inventoryService.getAvailableBatchesFEFO(medicine.id, branchAlpha.id);
    assert(fefoBatches.length === 2, "FEFO returned 2 active batches with positive stock");
    assert(
      fefoBatches[0].id === earlyBatch!.id,
      "FEFO algorithm strictly prioritizes early expiring batch FIRST"
    );
    assert(
      fefoBatches[1].id === lateBatch!.id,
      "FEFO algorithm places late expiring batch SECOND"
    );

    // ----------------------------------------------------
    // TEST 5: POS Checkout & Double-Entry Stock Deduction
    // ----------------------------------------------------
    console.log("\n--- 5. Testing POS Dispensing & Atomic Ledger Deduction ---");

    // Open cashier shift first (enforcing Phase 2 Shift-Gated POS rule)
    const shiftService = new ShiftService(tenantAlphaId);
    await shiftService.openShift(userAlpha.id, {
      branchId: branchAlpha.id,
      openingFloat: 150.0,
      notes: "Test 5 Shift Open",
    });

    // Dispense 15 units from earlyBatch
    const saleResult = await posService.processSale(userAlpha.id, {
      branchId: branchAlpha.id,
      items: [
        {
          medicineId: medicine.id,
          batchId: earlyBatch!.id,
          quantity: 15,
          unitPrice: 18.0,
          discount: 0,
          tax: 0,
        },
      ],
      payments: [
        {
          method: "CASH",
          amount: 270.0, // 15 * 18.0
        },
      ],
      discount: 0,
      tax: 0,
      notes: "POS In-person dispense",
    });

    assert(saleResult.receiptNumber.startsWith("REC-"), "Sale receipt number generated");
    assert(Number(saleResult.totalAmount) === 270.0, "Total sale amount calculated accurately");

    // Verify inventory balance after sale
    const earlyStockAfterSale = await inventoryService.getBatchBalance(
      earlyBatch!.id,
      branchAlpha.id
    );
    assert(
      earlyStockAfterSale === 85,
      "Early batch balance accurately reduced from 100 to 85 (100 - 15 = 85)"
    );

    // Verify ledger has an immutable SALE entry with negative quantity -15
    const latestLedger = await inventoryService.listLedger({
      batchId: earlyBatch!.id,
    });
    const saleLedgerEntry = latestLedger.items.find(
      (e: any) => e.transactionType === InventoryTransactionType.SALE
    );

    assert(saleLedgerEntry !== undefined, "Inventory ledger contains SALE entry");
    assert(
      Number(saleLedgerEntry.quantity) === -15,
      "Inventory ledger records exact -15.00 negative quantity movement"
    );

    // ----------------------------------------------------
    // TEST 6: Stock Adjustment Movement
    // ----------------------------------------------------
    console.log("\n--- 6. Testing Stock Reconciliation & Adjustment ---");

    // Perform an audit physical adjustment: -5 damaged units
    await inventoryService.adjustStock(userAlpha.id, {
      medicineId: medicine.id,
      batchId: earlyBatch!.id,
      branchId: branchAlpha.id,
      quantity: -5,
      notes: "Damaged packaging discarded during audit",
    });

    const earlyStockAfterAdjustment = await inventoryService.getBatchBalance(
      earlyBatch!.id,
      branchAlpha.id
    );
    assert(
      earlyStockAfterAdjustment === 80,
      "Early batch balance accurately updated after adjustment (85 - 5 = 80)"
    );

    console.log("\n=======================================================");
    console.log("   ALL PHASE 1 INTEGRATION TESTS PASSED (100%)         ");
    console.log("=======================================================\n");
  } finally {
    // Cleanup test tenants in foreign key order
    const tenantIds = [tenantAlphaId, tenantBetaId];
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: tenantIds } } } });
    await prisma.payment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.sale.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.purchaseItem.deleteMany({ where: { purchase: { tenantId: { in: tenantIds } } } });
    await prisma.purchase.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.medicine.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.supplier.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.category.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.dosageForm.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.shiftTransaction.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.shift.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: { in: tenantIds } } } });
    await prisma.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
}

runPhase1Suite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
