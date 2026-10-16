import { prisma } from "../lib/db/prisma";
import { AuditService } from "../services/audit.service";
import { ComplianceService } from "../services/compliance.service";
import { PERMISSIONS } from "../lib/permissions/permissions";
import { AuditAction, LicenseStatus, LicenseType, PurchaseStatus, SaleStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase6Suite() {
  console.log("\n==================================================================");
  console.log("   PHASE 6 INTEGRATION TEST SUITE: COMPLIANCE & AUDIT TRAIL       ");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const tenantAlphaId = `tenant-p6-alpha-${timestamp}`;
  const tenantBetaId = `tenant-p6-beta-${timestamp}`;

  // 1. Provision isolated test tenants
  await prisma.tenant.createMany({
    data: [
      { id: tenantAlphaId, name: "Alpha Compliance Pharmacy", slug: `alpha-p6-${timestamp}` },
      { id: tenantBetaId, name: "Beta Compliance Pharmacy", slug: `beta-p6-${timestamp}` },
    ],
  });

  // 2. Provision Admin Role & User for Alpha
  const allPermissions = await prisma.permission.findMany();
  const adminRoleAlpha = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Compliance Officer",
      isSystem: false,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: adminRoleAlpha.id,
      permissionId: p.id,
    })),
  });

  const complianceUser = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-comp-officer-${timestamp}`,
      roleId: adminRoleAlpha.id,
      name: "Dr. Rachel Green, Chief Compliance Officer",
      email: `rachel-${timestamp}@alphapharm.local`,
    },
  });

  const branchAlpha = await prisma.branch.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Alpha Clinical Vault",
      code: `VAULT-${timestamp.toString().slice(-4)}`,
      isMain: true,
    },
  });

  const auditServiceAlpha = new AuditService(tenantAlphaId);
  const complianceAlpha = new ComplianceService(tenantAlphaId);
  const complianceBeta = new ComplianceService(tenantBetaId);

  try {
    // ============================================================================
    // TEST 1: IMMUTABLE GLOBAL AUDIT LOGGING & STATE DIFFS
    // ============================================================================
    console.log("--- 1. Testing Immutable Global Audit Logging ---");

    const medicineId = `med-test-${timestamp}`;

    // Log an UPDATE mutation with old vs new values (e.g. price change)
    const logEntry = await auditServiceAlpha.logMutation({
      tenantId: tenantAlphaId,
      userId: complianceUser.id,
      action: AuditAction.UPDATE,
      entity: "Medicine",
      entityId: medicineId,
      oldValues: {
        sku: "MORPH-10",
        name: "Morphine Sulfate 10mg",
        sellingPrice: 15.0,
        isControlled: true,
      },
      newValues: {
        sku: "MORPH-10",
        name: "Morphine Sulfate 10mg",
        sellingPrice: 18.0,
        isControlled: true,
      },
      ipAddress: "192.168.1.100",
    });

    assert(logEntry.id !== undefined, "Audit log generated with immutable ID");
    assert(logEntry.action === AuditAction.UPDATE, "Audit action recorded as UPDATE");
    assert(logEntry.entity === "Medicine", "Audit entity captured as Medicine");

    // Retrieve via ComplianceService
    const logsList = await complianceAlpha.listAuditLogs({
      entity: "Medicine",
      entityId: medicineId,
      page: 1,
      limit: 10,
    });

    assert(logsList.total === 1, "Audit logs query returned exactly 1 matching record");
    assert(logsList.items[0].user?.id === complianceUser.id, "Audit user accurately mapped");
    const oldVals = logsList.items[0].oldValues as any;
    const newVals = logsList.items[0].newValues as any;
    assert(Number(oldVals.sellingPrice) === 15.0, "Old sellingPrice accurately audited at 15.00");
    assert(Number(newVals.sellingPrice) === 18.0, "New sellingPrice accurately audited at 18.00");

    // ============================================================================
    // TEST 2: CONTROLLED SUBSTANCES REGULATORY LEDGER (CHAIN OF CUSTODY)
    // ============================================================================
    console.log("\n--- 2. Testing Controlled Substances Chain of Custody ---");

    // 1. Setup Controlled Medicine (Schedule II)
    const category = await prisma.category.create({
      data: {
        tenantId: tenantAlphaId,
        name: `Narcotics-${timestamp}`,
      },
    });

    const controlledMed = await prisma.medicine.create({
      data: {
        tenantId: tenantAlphaId,
        categoryId: category.id,
        name: "Oxycodone HCl 20mg",
        sku: `OXY-20-${timestamp.toString().slice(-4)}`,
        strength: "20mg",
        isPrescriptionRequired: true,
        isNarcotic: true,
        isControlled: true,
        regulatorySchedule: "Schedule II",
      },
    });

    const batch = await prisma.medicineBatch.create({
      data: {
        tenantId: tenantAlphaId,
        medicineId: controlledMed.id,
        batchNumber: `OXY-LOT-${timestamp.toString().slice(-4)}`,
        purchasePrice: 12.0,
        sellingPrice: 35.0,
        expiryDate: new Date(Date.now() + 365 * 86400000),
      },
    });

    // 2. Inbound Custody: Purchase Order from Supplier
    const supplier = await prisma.supplier.create({
      data: {
        tenantId: tenantAlphaId,
        name: `Secure Pharma Logistics ${timestamp}`,
        contactPerson: "Agent Smith",
        phone: "+1-555-8899",
        taxId: "DEA-REG-9912",
      },
    });

    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenantAlphaId,
        supplierId: supplier.id,
        invoiceNumber: `DEA-INV-${timestamp.toString().slice(-4)}`,
        totalAmount: 1200.0,
        paidAmount: 1200.0,
        status: PurchaseStatus.RECEIVED,
      },
    });

    // Inflow Ledger Entry
    await prisma.inventoryLedger.create({
      data: {
        tenantId: tenantAlphaId,
        branchId: branchAlpha.id,
        medicineId: controlledMed.id,
        batchId: batch.id,
        transactionType: "PURCHASE",
        quantity: 100,
        referenceType: "PURCHASE",
        referenceId: purchase.id,
        notes: "DEA Form 222 Order Inbound Intake",
        createdBy: complianceUser.id,
      },
    });

    // 3. Outbound Custody: Clinical Prescription Dispensing
    const doctor = await prisma.doctor.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Dr. Marcus Welby, MD",
        licenseNumber: `DEA-MD-LIC-${timestamp.toString().slice(-4)}`,
        specialization: "Oncology & Palliative Care",
        hospitalAffiliation: "Metropolitan Cancer Institute",
      },
    });

    const customer = await prisma.customer.create({
      data: {
        tenantId: tenantAlphaId,
        name: "Robert Frost (Patient Account)",
        phone: "+1-555-2200",
      },
    });

    const patient = await prisma.patient.create({
      data: {
        tenantId: tenantAlphaId,
        customerId: customer.id,
        name: "Robert Frost",
        dob: new Date("1965-03-22"),
        gender: "MALE",
      },
    });

    const prescription = await prisma.prescription.create({
      data: {
        tenantId: tenantAlphaId,
        doctorId: doctor.id,
        patientId: patient.id,
        prescriptionNumber: `RX-NARCOTIC-${timestamp.toString().slice(-4)}`,
        status: "DISPENSED",
      },
    });

    const sale = await prisma.sale.create({
      data: {
        tenantId: tenantAlphaId,
        branchId: branchAlpha.id,
        userId: complianceUser.id,
        prescriptionId: prescription.id,
        receiptNumber: `REC-OXY-${timestamp.toString().slice(-4)}`,
        subtotal: 70.0,
        totalAmount: 70.0,
        paidAmount: 70.0,
        status: SaleStatus.COMPLETED,
      },
    });

    // Outflow Ledger Entry
    await prisma.inventoryLedger.create({
      data: {
        tenantId: tenantAlphaId,
        branchId: branchAlpha.id,
        medicineId: controlledMed.id,
        batchId: batch.id,
        transactionType: "SALE",
        quantity: -2,
        referenceType: "SALE",
        referenceId: sale.id,
        notes: "Dispensed against verified Schedule II prescription",
        createdBy: complianceUser.id,
      },
    });

    // Query Controlled Substance Ledger
    const custodyLedger = await complianceAlpha.getControlledSubstancesLedger({
      medicineId: controlledMed.id,
      page: 1,
      limit: 10,
    });

    assert(custodyLedger.total === 2, "Controlled substance register returned exactly 2 custody records");

    const inflow = custodyLedger.items.find((i) => i.transactionType === "PURCHASE");
    const outflow = custodyLedger.items.find((i) => i.transactionType === "SALE");

    assert(inflow !== undefined, "Procurement inflow recorded in custody chain");
    assert(inflow?.procurementContext?.supplier?.name.includes("Secure Pharma"), "Inflow linked to authorized supplier");
    assert(inflow?.medicine.regulatorySchedule === "Schedule II", "Medication tagged as Schedule II");

    assert(outflow !== undefined, "Dispensing outflow recorded in custody chain");
    assert(outflow?.clinicalContext?.doctor?.name === "Dr. Marcus Welby, MD", "Outflow accurately traced to prescribing physician");
    assert(outflow?.clinicalContext?.patient?.name === "Robert Frost", "Outflow accurately traced to patient identity");
    assert(outflow?.clinicalContext?.prescriptionNumber?.includes("RX-NARCOTIC"), "Outflow links to prescription number");

    // ============================================================================
    // TEST 3: PHARMACY LICENSES & PERMIT SURVEILLANCE
    // ============================================================================
    console.log("\n--- 3. Testing Pharmacy License Surveillance ---");

    const now = new Date();

    // 1. Active Operating License
    const operatingLicense = await complianceAlpha.createLicense(complianceUser.id, {
      licenseType: LicenseType.OPERATING,
      licenseNumber: `STATE-DISP-${timestamp}`,
      issueDate: new Date("2025-01-01"),
      expiryDate: new Date(now.getTime() + 180 * 86400000), // 180 days out
      status: LicenseStatus.ACTIVE,
      documentUrl: "https://vault.health.gov/dispensary-alpha.pdf",
    });

    // 2. Expiring Soon Permit (within 45 days)
    const expiringSoonLicense = await complianceAlpha.createLicense(complianceUser.id, {
      licenseType: LicenseType.NARCOTIC_DISPENSING,
      licenseNumber: `DEA-NARCOTIC-${timestamp}`,
      issueDate: new Date("2024-01-01"),
      expiryDate: new Date(now.getTime() + 30 * 86400000), // 30 days out
      status: LicenseStatus.ACTIVE,
      documentUrl: "https://dea.gov/narcotic-alpha.pdf",
    });

    const licenses = await complianceAlpha.listLicenses();
    assert(licenses.length >= 2, "Retrieved pharmacy licenses");

    const opLic = licenses.find((l: any) => l.id === operatingLicense.id);
    const expLic = licenses.find((l: any) => l.id === expiringSoonLicense.id);

    assert(opLic?.status === LicenseStatus.ACTIVE, "Operating license is ACTIVE");
    assert(opLic?.isExpiringSoon === false, "Operating license is not expiring soon (>60 days)");
    assert(expLic?.isExpiringSoon === true, "Narcotic permit flagged as EXPIRING SOON (<60 days)");

    // Test updating license status to SUSPENDED
    const suspended = await complianceAlpha.updateLicenseStatus(
      complianceUser.id,
      operatingLicense.id,
      LicenseStatus.SUSPENDED
    );
    assert(suspended.status === LicenseStatus.SUSPENDED, "License status successfully updated to SUSPENDED");

    // ============================================================================
    // TEST 4: MULTI-TENANT REGULATORY ISOLATION
    // ============================================================================
    console.log("\n--- 4. Testing Multi-Tenant Compliance Isolation ---");

    const betaLogs = await complianceBeta.listAuditLogs({});
    assert(betaLogs.total === 0, "Tenant Beta cannot view Tenant Alpha's audit logs (Total: 0)");

    const betaControlled = await complianceBeta.getControlledSubstancesLedger({ page: 1, limit: 10 });
    assert(betaControlled.total === 0, "Tenant Beta cannot view Tenant Alpha's controlled substances (Total: 0)");

    const betaLicenses = await complianceBeta.listLicenses();
    assert(betaLicenses.length === 0, "Tenant Beta cannot view Tenant Alpha's regulatory permits (Total: 0)");
  } finally {
    // Teardown
    await prisma.pharmacyLicense.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.auditLog.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.inventoryLedger.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.sale.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.prescription.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.patient.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.doctor.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.purchase.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.supplier.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.medicineBatch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.medicine.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.category.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.pharmacyUser.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.rolePermission.deleteMany({
      where: { role: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
    });
    await prisma.role.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.branch.deleteMany({ where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAlphaId, tenantBetaId] } } });
  }

  console.log("\n==================================================================");
  console.log("   ALL PHASE 6 COMPLIANCE & AUDIT TESTS PASSED (100%)             ");
  console.log("==================================================================\n");
}

runPhase6Suite().catch((err) => {
  console.error("Phase 6 Test Suite Failed:", err);
  process.exit(1);
});
