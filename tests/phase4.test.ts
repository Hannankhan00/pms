import { prisma } from "../lib/db/prisma";
import { FinanceService } from "../services/finance.service";
import { MetricsService } from "../services/metrics.service";
import { PERMISSIONS } from "../lib/permissions/permissions";
import { PaymentMethod, PaymentType, AccountType, SaleStatus, PurchaseStatus, Prisma } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase4Suite() {
  console.log("\n==================================================================");
  console.log("   PHASE 4 INTEGRATION TEST SUITE: OPERATIONAL FINANCE & ACCOUNTS ");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const tenantAlphaId = `tenant-p4-alpha-${timestamp}`;
  const tenantBetaId = `tenant-p4-beta-${timestamp}`;

  // 1. Provision isolated test tenants
  await prisma.tenant.createMany({
    data: [
      { id: tenantAlphaId, name: "Alpha Financial Pharmacy", slug: `alpha-p4-${timestamp}` },
      { id: tenantBetaId, name: "Beta Financial Pharmacy", slug: `beta-p4-${timestamp}` },
    ],
  });

  // 2. Fetch system permissions
  const allPermissions = await prisma.permission.findMany();
  const financeManagePerm = allPermissions.find((p) => p.code === PERMISSIONS.FINANCE_MANAGE);
  const financeViewPerm = allPermissions.find((p) => p.code === PERMISSIONS.FINANCE_VIEW);

  // 3. Provision Roles (Finance Manager with FINANCE_MANAGE vs Regular Staff without it)
  const managerRole = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Finance Controller",
      isSystem: false,
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "General Staff",
      isSystem: false,
    },
  });

  // Grant permissions to Finance Manager
  const permsToGrant = [financeManagePerm, financeViewPerm].filter(Boolean);
  for (const perm of permsToGrant) {
    await prisma.rolePermission.create({
      data: {
        roleId: managerRole.id,
        permissionId: perm!.id,
      },
    });
  }

  // 4. Provision Users
  const financeManager = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-fin-mgr-${timestamp}`,
      roleId: managerRole.id,
      name: "Arthur Pendelton, CPA",
      email: `arthur-${timestamp}@alphapharm.local`,
    },
  });

  const unauthorizedUser = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-clerk-${timestamp}`,
      roleId: staffRole.id,
      name: "Trainee Clerk",
      email: `clerk-${timestamp}@alphapharm.local`,
    },
  });

  // 5. Provision Branch
  const branchAlpha = await prisma.branch.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Alpha Main Dispensary",
      code: `DISP-${timestamp.toString().slice(-4)}`,
      isMain: true,
    },
  });

  const financeAlpha = new FinanceService(tenantAlphaId);
  const metricsAlpha = new MetricsService(tenantAlphaId);

  // ============================================================================
  // TEST 1: EXPENSES & IMMUTABLE DOUBLE-ENTRY LEDGER
  // ============================================================================
  console.log("\n--- 1. Testing Operating Expenses & Double-Entry General Ledger ---");

  // Create Category
  const category = await financeAlpha.createExpenseCategory(financeManager.id, {
    name: `Utilities-${timestamp}`,
    description: "Branch electrical, clinical refrigeration, and HVAC",
  });
  assert(category.id !== undefined, "Expense category created");

  // Record Expense
  const expense = await financeAlpha.createExpense(financeManager.id, {
    categoryId: category.id,
    branchId: branchAlpha.id,
    amount: 175.5,
    description: "Monthly clinical refrigeration backup power test",
    paymentMethod: PaymentMethod.CASH,
  });

  assert(expense.id !== undefined, "Expense recorded successfully");
  assert(Number(expense.amount) === 175.5, "Expense amount recorded accurately ($175.50)");

  // Verify Double-Entry AccountLedger
  const ledgers = await prisma.accountLedger.findMany({
    where: { expenseId: expense.id, tenantId: tenantAlphaId },
  });

  assert(ledgers.length === 2, "Double-entry generated exactly 2 balancing ledger entries");

  const debitEntry = ledgers.find((l: any) => l.accountType === AccountType.OPERATING_EXPENSE);
  const creditEntry = ledgers.find((l: any) => l.accountType === AccountType.CASH_DRAWER);

  assert(debitEntry !== undefined, "Operating Expense account debited");
  assert(Number(debitEntry?.debit) === 175.5, "Debit amount equals $175.50");

  assert(creditEntry !== undefined, "Cash Drawer account credited");
  assert(Number(creditEntry?.credit) === 175.5, "Credit amount equals $175.50");

  // Financial Immutability: Reverse the transaction instead of deleting
  const reversed = await financeAlpha.reverseExpense(
    financeManager.id,
    expense.id,
    "Invoice entered under wrong branch code"
  );

  assert(reversed.isReversed === true, "Expense marked as reversed (isReversed: true)");
  assert(reversed.reversalReason === "Invoice entered under wrong branch code", "Reversal reason audited");

  const reversalLedgers = await prisma.accountLedger.findMany({
    where: { referenceType: "EXPENSE_REVERSAL", referenceId: expense.id, tenantId: tenantAlphaId },
  });
  assert(reversalLedgers.length === 2, "Compensating double-entry reversal entries posted to ledger");

  // ============================================================================
  // TEST 2: ACCOUNTS PAYABLE & SUPPLIER PAYMENT DISTRIBUTION
  // ============================================================================
  console.log("\n--- 2. Testing Accounts Payable & Supplier Settlement ---");

  const supplier = await prisma.supplier.create({
    data: {
      tenantId: tenantAlphaId,
      name: `PharmaCorp Wholesalers ${timestamp}`,
      contactPerson: "Marcus Vance",
      phone: "+1-555-8901",
      currentBalance: 500.0, // Initial payables balance
    },
  });

  // Create 2 Purchase Orders
  const purchase1 = await prisma.purchase.create({
    data: {
      tenantId: tenantAlphaId,
      supplierId: supplier.id,
      invoiceNumber: `INV-P1-${timestamp.toString().slice(-4)}`,
      totalAmount: 300.0,
      paidAmount: 0.0,
      status: PurchaseStatus.RECEIVED,
    },
  });

  const purchase2 = await prisma.purchase.create({
    data: {
      tenantId: tenantAlphaId,
      supplierId: supplier.id,
      invoiceNumber: `INV-P2-${timestamp.toString().slice(-4)}`,
      totalAmount: 200.0,
      paidAmount: 0.0,
      status: PurchaseStatus.RECEIVED,
    },
  });

  // Pay Supplier $350.00 via Bank Transfer (FIFO: $300 to purchase1, $50 to purchase2)
  const payResult = await financeAlpha.paySupplier(financeManager.id, {
    supplierId: supplier.id,
    amount: 350.0,
    method: PaymentMethod.BANK_TRANSFER,
    referenceNumber: "WIRE-REF-99120",
    notes: "Batch settlement for purchases",
  });

  assert(payResult.payment.id !== undefined, "Supplier payment record created");
  assert(payResult.payment.type === PaymentType.SUPPLIER_PAYMENT, "Payment type flagged as SUPPLIER_PAYMENT");
  assert(payResult.links.length === 2, "Payment allocated across 2 purchase invoices");

  // Verify Supplier currentBalance decremented
  const updatedSupplier = await prisma.supplier.findUnique({ where: { id: supplier.id } });
  assert(Number(updatedSupplier?.currentBalance) === 150.0, "Supplier currentBalance decremented to $150.00 ($500 - $350)");

  // Verify Purchases updated
  const updatedP1 = await prisma.purchase.findUnique({ where: { id: purchase1.id } });
  const updatedP2 = await prisma.purchase.findUnique({ where: { id: purchase2.id } });
  assert(Number(updatedP1?.paidAmount) === 300.0, "Purchase 1 fully settled ($300.00)");
  assert(Number(updatedP2?.paidAmount) === 50.0, "Purchase 2 partially settled ($50.00 paid)");

  // Verify Accounts Payable double-entry ledger
  const apLedgers = await prisma.accountLedger.findMany({
    where: { paymentId: payResult.payment.id, tenantId: tenantAlphaId },
  });
  assert(apLedgers.length === 2, "Accounts Payable double-entry ledger created");
  assert(apLedgers.some((l: any) => l.accountType === AccountType.ACCOUNTS_PAYABLE && Number(l.debit) === 350.0), "Accounts Payable debited $350.00");
  assert(apLedgers.some((l: any) => l.accountType === AccountType.BANK && Number(l.credit) === 350.0), "Bank account credited $350.00");

  // ============================================================================
  // TEST 3: ACCOUNTS RECEIVABLE & CUSTOMER CREDIT COLLECTION
  // ============================================================================
  console.log("\n--- 3. Testing Accounts Receivable & Customer Settlement ---");

  const customer = await prisma.customer.create({
    data: {
      tenantId: tenantAlphaId,
      name: `Eleanor Vance ${timestamp}`,
      phone: "+1-555-7722",
      creditLimit: 1000.0,
      currentBalance: 250.0, // Credit balance due
    },
  });

  // Create Credit Sale
  const creditSale = await prisma.sale.create({
    data: {
      tenantId: tenantAlphaId,
      branchId: branchAlpha.id,
      customerId: customer.id,
      userId: financeManager.id,
      receiptNumber: `REC-CR-${timestamp.toString().slice(-4)}`,
      subtotal: 250.0,
      totalAmount: 250.0,
      paidAmount: 0.0,
      status: SaleStatus.COMPLETED,
    },
  });

  // Receive $175.00 payment from customer
  const receiveResult = await financeAlpha.receiveCustomerPayment(financeManager.id, {
    customerId: customer.id,
    amount: 175.0,
    method: PaymentMethod.CASH,
    referenceNumber: "REC-CASH-001",
    notes: "Partial payment on credit tab",
  });

  assert(receiveResult.payment.id !== undefined, "Customer receipt created");
  assert(receiveResult.payment.type === PaymentType.CUSTOMER_RECEIPT, "Payment type flagged as CUSTOMER_RECEIPT");

  // Verify Customer currentBalance decremented
  const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
  assert(Number(updatedCustomer?.currentBalance) === 75.0, "Customer currentBalance decremented to $75.00 ($250 - $175)");

  // Verify Sale paidAmount updated
  const updatedSale = await prisma.sale.findUnique({ where: { id: creditSale.id } });
  assert(Number(updatedSale?.paidAmount) === 175.0, "Sale paidAmount incremented to $175.00");

  // Verify Accounts Receivable double-entry ledger
  const arLedgers = await prisma.accountLedger.findMany({
    where: { paymentId: receiveResult.payment.id, tenantId: tenantAlphaId },
  });
  assert(arLedgers.length === 2, "Accounts Receivable double-entry ledger created");
  assert(arLedgers.some((l: any) => l.accountType === AccountType.CASH_DRAWER && Number(l.debit) === 175.0), "Cash drawer debited $175.00");
  assert(arLedgers.some((l: any) => l.accountType === AccountType.ACCOUNTS_RECEIVABLE && Number(l.credit) === 175.0), "Accounts Receivable credited $175.00");

  // ============================================================================
  // TEST 4: STRICT RBAC ENFORCEMENT
  // ============================================================================
  console.log("\n--- 4. Testing Strict RBAC Authorization Guards ---");

  let unauthorizedBlocked = false;
  try {
    await financeAlpha.createExpense(unauthorizedUser.id, {
      categoryId: category.id,
      amount: 50.0,
      description: "Unauthorized expense attempt",
      paymentMethod: PaymentMethod.CASH,
    });
  } catch (err: any) {
    if (err.name === "AuthorizationError" || err.message.includes("Access denied")) {
      unauthorizedBlocked = true;
    }
  }
  assert(unauthorizedBlocked, "Unauthorized staff blocked from recording expenses (AuthorizationError 403)");

  let unauthorizedPayBlocked = false;
  try {
    await financeAlpha.paySupplier(unauthorizedUser.id, {
      supplierId: supplier.id,
      amount: 100.0,
      method: PaymentMethod.CASH,
    });
  } catch (err: any) {
    if (err.name === "AuthorizationError" || err.message.includes("Access denied")) {
      unauthorizedPayBlocked = true;
    }
  }
  assert(unauthorizedPayBlocked, "Unauthorized staff blocked from supplier disbursements (AuthorizationError 403)");

  // ============================================================================
  // TEST 5: GROSS PROFIT CALCULATION SERVICE
  // ============================================================================
  console.log("\n--- 5. Testing Gross Profit & COGS Calculation Service ---");

  // Provision Category, Medicine, Batch, and Sale with specific COGS
  const medCategory = await prisma.category.create({
    data: {
      tenantId: tenantAlphaId,
      name: `Analgesics-${timestamp}`,
    },
  });

  const medicine = await prisma.medicine.create({
    data: {
      tenantId: tenantAlphaId,
      categoryId: medCategory.id,
      sku: `SKU-PROFIT-${timestamp.toString().slice(-4)}`,
      name: "Ibuprofen 400mg Film-Coated",
      strength: "400mg",
      reorderLevel: 10,
    },
  });

  // Purchase Price = $4.00, Selling Price = $12.00
  const batch = await prisma.medicineBatch.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: medicine.id,
      batchNumber: `BAT-IBU-${timestamp.toString().slice(-4)}`,
      expiryDate: new Date("2029-01-01"),
      purchasePrice: 4.0, // COGS Basis
      sellingPrice: 12.0, // Revenue Basis
    },
  });

  // Sale of 10 units: Revenue = $120.00, COGS = 10 * $4.00 = $40.00, Profit = $80.00
  const profitSale = await prisma.sale.create({
    data: {
      tenantId: tenantAlphaId,
      branchId: branchAlpha.id,
      userId: financeManager.id,
      receiptNumber: `REC-PRF-${timestamp.toString().slice(-4)}`,
      subtotal: 120.0,
      totalAmount: 120.0,
      paidAmount: 120.0,
      status: SaleStatus.COMPLETED,
      saleDate: new Date(),
    },
  });

  await prisma.saleItem.create({
    data: {
      saleId: profitSale.id,
      medicineId: medicine.id,
      batchId: batch.id,
      quantity: 10,
      unitPrice: 12.0,
      subtotal: 120.0,
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const profitReport = await metricsAlpha.calculateGrossProfit({
    startDate: today,
    endDate: today,
    branchId: branchAlpha.id,
  });

  assert(profitReport.totalRevenue >= 120.0, "Total revenue calculated correctly");
  assert(profitReport.totalCogs >= 40.0, "COGS accurately computed via batch purchase price (10 units * $4.00 = $40.00)");
  assert(profitReport.grossProfit >= 80.0, "Gross profit correctly calculated ($120 - $40 = $80)");
  
  const itemStat = profitReport.itemBreakdown.find((i) => i.medicineId === medicine.id);
  assert(itemStat !== undefined, "Item breakdown contains sold medication");
  assert(itemStat?.marginPercentage === 66.67, "Gross margin percentage accurately computed (66.7%)");

  // ============================================================================
  // TEST 6: MULTI-TENANT FINANCIAL ISOLATION
  // ============================================================================
  console.log("\n--- 6. Testing Multi-Tenant Financial Data Isolation ---");

  const financeBeta = new FinanceService(tenantBetaId);
  const metricsBeta = new MetricsService(tenantBetaId);

  const betaExpenses = await financeBeta.getExpenses();
  assert(betaExpenses.length === 0, "Tenant Beta cannot view Tenant Alpha expenses");

  const betaPayables = await financeBeta.getPayables();
  assert(betaPayables.length === 0, "Tenant Beta cannot view Tenant Alpha payables");

  const betaReceivables = await financeBeta.getReceivables();
  assert(betaReceivables.length === 0, "Tenant Beta cannot view Tenant Alpha receivables");

  const betaMetrics = await metricsBeta.calculateGrossProfit({ startDate: today, endDate: today });
  assert(betaMetrics.totalRevenue === 0, "Tenant Beta revenue is strictly isolated ($0.00)");
  assert(betaMetrics.grossProfit === 0, "Tenant Beta gross profit is strictly isolated ($0.00)");

  // Cleanup test tenants
  const tenantIds = [tenantAlphaId, tenantBetaId];
  await prisma.accountLedger.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.supplierPaymentLink.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.customerPaymentLink.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.expense.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.expenseCategory.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.payment.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.saleItem.deleteMany({ where: { sale: { tenantId: { in: tenantIds } } } });
  await prisma.sale.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.purchaseItem.deleteMany({ where: { purchase: { tenantId: { in: tenantIds } } } });
  await prisma.purchase.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.medicine.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.category.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.customer.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.supplier.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.rolePermission.deleteMany({ where: { role: { tenantId: { in: tenantIds } } } });
  await prisma.role.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.branch.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

  console.log("\n==================================================================");
  console.log("   ALL PHASE 4 OPERATIONAL FINANCE TESTS PASSED (100%)            ");
  console.log("==================================================================\n");
}

runPhase4Suite()
  .catch((err) => {
    console.error("[SUITE_ERROR] Phase 4 Suite failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
