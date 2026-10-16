import { prisma } from "../lib/db/prisma";
import { PosService } from "../services/pos.service";
import { InventoryService } from "../services/inventory.service";
import { checkRateLimit, resetRateLimits } from "../lib/security/rate-limiter";
import { stripHtml } from "../lib/security/sanitize";
import { tenantSettingsSchema } from "../validations/tenant.schema";
import { CreateSaleSchema } from "../validations/pos.schema";
import {
  ShiftStatus,
  PaymentMethod,
  InventoryTransactionType,
  TenantStatus,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runReadinessTests() {
  console.log("==================================================================");
  console.log("   FINAL READINESS TEST SUITE: CONCURRENCY, SECURITY & AUDIT      ");
  console.log("==================================================================");

  const testTenantId = "tenant-readiness-test";
  const testBranchId = "b1111111-1111-4111-8111-111111111111";
  const testUserId = "user-readiness-test";
  const testRoleId = "role-readiness-owner";
  const testShiftId = "shift-readiness-test";
  const testMedicineId = "e2222222-2222-4222-8222-222222222222";
  const testBatchId = "c3333333-3333-4333-8333-333333333333";

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Input Sanitization & Stored XSS Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 1: Input Sanitization & Stored XSS Prevention ---");

    const xssScript = "<script>alert('xss')</script>Downtown Care Rx";
    const sanitizedScript = stripHtml(xssScript);
    assert(sanitizedScript === "Downtown Care Rx", "stripHtml completely purges <script> tags");

    const xssIframe = "<iframe src='https://malicious.evil.com'></iframe>Receipt Header";
    assert(stripHtml(xssIframe) === "Receipt Header", "stripHtml completely purges <iframe> tags");

    const xssJsUrl = "javascript:alert(document.cookie)";
    assert(stripHtml(xssJsUrl) === "alert(document.cookie)", "stripHtml neutralizes javascript: pseudo-protocols");

    // Zod schema auto-sanitization test
    const parsedSettings = tenantSettingsSchema.parse({
      receiptHeader: "<b>Bold Clinic</b> <script>steal()</script>Hotline: 555-0199",
      taxId: "VAT-12345",
      defaultCurrency: "USD",
    });
    assert(
      parsedSettings.receiptHeader === "Bold Clinic Hotline: 555-0199",
      "tenantSettingsSchema automatically strips HTML tags during Zod parsing"
    );

    const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const parsedSale = CreateSaleSchema.parse({
      branchId: validUuid,
      items: [
        {
          medicineId: validUuid,
          batchId: validUuid,
          quantity: 1,
          unitPrice: 10,
          discount: 0,
          tax: 0,
        },
      ],
      payments: [{ method: PaymentMethod.CASH, amount: 10 }],
      notes: "Patient allergic to penicillin <script>maliciousCode()</script>",
    });
    assert(
      parsedSale.notes === "Patient allergic to penicillin",
      "CreateSaleSchema automatically cleans clinical notes of script injections"
    );

    // -------------------------------------------------------------------------
    // TEST 2: High-Performance Rate Limiting
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: API Rate Limiter Verification ---");
    resetRateLimits();

    const clientIp = "192.168.1.50";
    const provisionRoute = "/api/internal/provision-tenant";

    // 10 requests allowed for provisioning
    for (let i = 1; i <= 10; i++) {
      const res = checkRateLimit(clientIp, provisionRoute);
      assert(res.allowed === true, `Provisioning request ${i}/10 is allowed`);
      assert(res.remaining === 10 - i, `Remaining count accurately decrements to ${10 - i}`);
    }

    // 11th request must be blocked
    const blockedRes = checkRateLimit(clientIp, provisionRoute);
    assert(blockedRes.allowed === false, "11th request exceeds limit and is blocked with allowed: false");
    assert(blockedRes.remaining === 0, "Blocked request reports remaining: 0");
    assert(blockedRes.resetTime > Math.floor(Date.now() / 1000), "Reset time points to future window expiration");

    // -------------------------------------------------------------------------
    // TEST 3: POS Concurrency Race Condition Safety
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: POS & Inventory Ledger Concurrency Hardening ---");

    // Setup isolated test workspace
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.saleItem.deleteMany({ where: { sale: { tenantId: testTenantId } } });
    await prisma.sale.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.payment.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.medicine.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.shift.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: testTenantId } } });
    await prisma.role.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.branch.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });

    // Seed Tenant, Branch, Role, User, Shift
    await prisma.tenant.create({
      data: {
        id: testTenantId,
        name: "Readiness Pharmacy",
        slug: "readiness-rx",
        status: TenantStatus.ACTIVE,
      },
    });

    await prisma.branch.create({
      data: {
        id: testBranchId,
        tenantId: testTenantId,
        name: "Main Branch",
        code: "MAIN-01",
        isMain: true,
      },
    });

    const ownerRole = await prisma.role.create({
      data: {
        id: testRoleId,
        tenantId: testTenantId,
        name: "OWNER",
        isSystem: true,
      },
    });

    // Give all permissions to role
    const allPerms = await prisma.permission.findMany({ select: { id: true } });
    await prisma.rolePermission.createMany({
      data: allPerms.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
      skipDuplicates: true,
    });

    await prisma.pharmacyUser.create({
      data: {
        id: testUserId,
        tenantId: testTenantId,
        hubUserId: "hub-readiness-user",
        roleId: ownerRole.id,
        branchId: testBranchId,
        name: "Cashier Jane",
        email: "jane@readiness.test",
      },
    });

    await prisma.shift.create({
      data: {
        id: testShiftId,
        tenantId: testTenantId,
        userId: testUserId,
        branchId: testBranchId,
        status: ShiftStatus.OPEN,
        openingCash: 100,
      },
    });

    await prisma.medicine.create({
      data: {
        id: testMedicineId,
        tenantId: testTenantId,
        sku: "READINESS-AMOX-500",
        name: "Amoxicillin 500mg",
        isPrescriptionRequired: false,
      },
    });

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);

    await prisma.medicineBatch.create({
      data: {
        id: testBatchId,
        tenantId: testTenantId,
        medicineId: testMedicineId,
        batchNumber: "LOT-READINESS-01",
        expiryDate: futureDate,
        purchasePrice: 5.0,
        sellingPrice: 12.0,
      },
    });

    // Seed EXACTLY 5 units of stock into the inventory ledger
    await prisma.inventoryLedger.create({
      data: {
        tenantId: testTenantId,
        medicineId: testMedicineId,
        batchId: testBatchId,
        branchId: testBranchId,
        transactionType: InventoryTransactionType.PURCHASE,
        quantity: 5,
        notes: "Initial inventory setup of 5 units",
        createdBy: testUserId,
      },
    });

    const initialStock = await prisma.inventoryLedger.aggregate({
      where: { batchId: testBatchId },
      _sum: { quantity: true },
    });
    assert(Number(initialStock._sum.quantity) === 5, "Batch initial stock verified at exactly 5 units");

    // SIMULATE CONCURRENT CHECKOUT:
    // Two cashiers simultaneously attempting to sell 5 units of the medicine!
    console.log("Simulating 2 cashiers simultaneously attempting to sell all 5 units...");
    const posService = new PosService(testTenantId);

    const salePayload = {
      branchId: testBranchId,
      items: [
        {
          medicineId: testMedicineId,
          batchId: testBatchId,
          quantity: 5,
          unitPrice: 12.0,
          discount: 0,
          tax: 0,
        },
      ],
      payments: [
        {
          method: PaymentMethod.CASH,
          amount: 60.0,
        },
      ],
    };

    const results = await Promise.allSettled([
      posService.processSale(testUserId, salePayload),
      posService.processSale(testUserId, salePayload),
    ]);

    console.log("Results:", JSON.stringify(results, null, 2));
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(fulfilled.length === 1, "Exactly ONE concurrent transaction succeeds");
    assert(rejected.length === 1, "The competing transaction is rejected to protect inventory integrity");

    // Inspect the rejection reason
    const failureReason = (rejected[0] as PromiseRejectedResult).reason;
    console.log(`Competing sale rejection message: "${failureReason?.message}"`);
    assert(
      failureReason?.code === "P2034" ||
        failureReason?.message?.includes("write conflict") ||
        failureReason?.message?.includes("deadlock") ||
        failureReason?.message?.includes("balance changed") ||
        failureReason?.message?.includes("Insufficient") ||
        failureReason?.message?.includes("Concurrency"),
      "Competing sale was blocked with descriptive Concurrency Safety Violation"
    );

    // CRITICAL ASSERTION: The final batch stock must NEVER be negative!
    const finalStock = await prisma.inventoryLedger.aggregate({
      where: { batchId: testBatchId },
      _sum: { quantity: true },
    });
    const remainingUnits = Number(finalStock._sum.quantity);
    console.log(`Final remaining inventory balance: ${remainingUnits} units`);
    assert(remainingUnits === 0, "Inventory balance reached 0 and strictly prevented negative balance (-5)");

    console.log("\n==================================================================");
    console.log("   ALL READINESS PROTOCOL TESTS PASSED! (CONCURRENCY IMMUNITY)   ");
    console.log("==================================================================");
  } catch (error) {
    console.error("Test failure:", error);
    throw error;
  } finally {
    // Teardown
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.saleItem.deleteMany({ where: { sale: { tenantId: testTenantId } } });
    await prisma.sale.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.payment.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.medicine.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.shift.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: testTenantId } } });
    await prisma.role.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.branch.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.deleteMany({ where: { id: testTenantId } });
    console.log(`[CLEANUP] Deleted test tenant: ${testTenantId}`);
    await prisma.$disconnect();
  }
}

runReadinessTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
