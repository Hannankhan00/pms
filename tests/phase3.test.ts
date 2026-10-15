import { prisma } from "../lib/db/prisma";
import { ClinicalService } from "../services/clinical.service";
import { PosService } from "../services/pos.service";
import { ShiftService } from "../services/shift.service";
import { PERMISSIONS } from "../lib/permissions/permissions";
import { PrescriptionStatus, ShiftStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runPhase3Suite() {
  console.log("\n==================================================================");
  console.log("   PHASE 3 INTEGRATION TEST SUITE: CLINICAL WORKFLOW & CRM       ");
  console.log("==================================================================\n");

  const timestamp = Date.now();
  const tenantAlphaId = `tenant-p3-alpha-${timestamp}`;
  const tenantBetaId = `tenant-p3-beta-${timestamp}`;

  // 1. Provision isolated test tenants
  await prisma.tenant.createMany({
    data: [
      { id: tenantAlphaId, name: "Alpha Clinical Pharmacy", slug: `alpha-p3-${timestamp}` },
      { id: tenantBetaId, name: "Beta Clinical Pharmacy", slug: `beta-p3-${timestamp}` },
    ],
  });

  // 2. Fetch system permissions
  const allPermissions = await prisma.permission.findMany();
  const rxVerifyPerm = allPermissions.find((p) => p.code === PERMISSIONS.RX_VERIFY);
  const patientCreatePerm = allPermissions.find((p) => p.code === PERMISSIONS.PATIENT_CREATE);
  const salesCreatePerm = allPermissions.find((p) => p.code === PERMISSIONS.SALES_CREATE);
  const rxCreatePerm = allPermissions.find((p) => p.code === PERMISSIONS.PRESCRIPTION_CREATE);
  const shiftOpenPerm = allPermissions.find((p) => p.code === PERMISSIONS.SHIFT_OPEN);
  const posAccessPerm = allPermissions.find((p) => p.code === PERMISSIONS.POS_ACCESS);

  // 3. Provision Pharmacist Role (with RX_VERIFY) and Cashier Role (without RX_VERIFY)
  const pharmacistRole = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Lead Pharmacist",
      isSystem: false,
    },
  });

  const cashierRole = await prisma.role.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Junior Cashier",
      isSystem: false,
    },
  });

  // Link all permissions to Pharmacist
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({
      roleId: pharmacistRole.id,
      permissionId: p.id,
    })),
  });

  // Link only POS, Shift, and Sales permissions to Cashier (NO RX_VERIFY)
  const cashierPerms = [salesCreatePerm, shiftOpenPerm, posAccessPerm].filter(Boolean);
  await prisma.rolePermission.createMany({
    data: cashierPerms.map((p) => ({
      roleId: cashierRole.id,
      permissionId: p!.id,
    })),
  });

  // 4. Provision users
  const pharmacist = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-pharmacist-${timestamp}`,
      roleId: pharmacistRole.id,
      name: "Dr. Alice Pharmacist",
      email: `pharmacist-${timestamp}@alpha.local`,
    },
  });

  const cashier = await prisma.pharmacyUser.create({
    data: {
      tenantId: tenantAlphaId,
      hubUserId: `hub-cashier-${timestamp}`,
      roleId: cashierRole.id,
      name: "Bob Cashier",
      email: `cashier-${timestamp}@alpha.local`,
    },
  });

  // 5. Provision Branch & Open Cashier Shift for POS
  const branchAlpha = await prisma.branch.create({
    data: {
      tenantId: tenantAlphaId,
      name: "Alpha Main Dispensary",
      code: `DISP-${timestamp.toString().slice(-4)}`,
      isMain: true,
    },
  });

  const shiftServiceAlpha = new ShiftService(tenantAlphaId);
  await shiftServiceAlpha.openShift(pharmacist.id, {
    branchId: branchAlpha.id,
    openingCash: 150.0,
  });

  const clinicalAlpha = new ClinicalService(tenantAlphaId);
  const posAlpha = new PosService(tenantAlphaId);

  // ============================================================================
  // TEST 1: SEPARATION OF CONCERNS (CUSTOMER VS PATIENT)
  // ============================================================================
  console.log("\n--- 1. Testing Separation of Concerns: Customer vs Patient ---");

  // Create financial billing Customer
  const customer = await clinicalAlpha.createCustomer(pharmacist.id, {
    name: "John Parent (Head of Household)",
    phone: "+1-555-8888",
    email: "john.parent@example.com",
    address: "742 Evergreen Terrace",
    creditLimit: 500.0,
    currentBalance: 0.0,
  });

  assert(customer.id !== undefined, "Customer created with UUID");
  assert(Number(customer.creditLimit) === 500.0, "Customer credit limit is $500.00");

  // Create linked Patient (child 1) with Penicillin allergy
  const patientChild1 = await clinicalAlpha.createPatient(pharmacist.id, {
    name: "Tommy Parent",
    dob: new Date("2015-06-12"),
    gender: "MALE",
    bloodGroup: "O+",
    allergies: "Penicillin, Amoxicillin",
    medicalHistory: "Childhood Asthma",
    customerId: customer.id,
  });

  assert(patientChild1.customerId === customer.id, "Patient 1 linked to Parent Customer");
  assert(patientChild1.allergies?.includes("Penicillin") === true, "Patient has recorded Penicillin allergy");

  // Create linked Patient (child 2) with No allergies
  const patientChild2 = await clinicalAlpha.createPatient(pharmacist.id, {
    name: "Sally Parent",
    dob: new Date("2018-09-20"),
    gender: "FEMALE",
    bloodGroup: "A+",
    allergies: "",
    customerId: customer.id,
  });

  assert(patientChild2.customerId === customer.id, "Patient 2 linked to same Customer");

  // Verify Patient profile retrieval with linked Customer
  const patientProfile = await clinicalAlpha.getPatient(patientChild1.id);
  assert(patientProfile.customer?.id === customer.id, "Patient profile includes full customer billing relation");
  assert(patientProfile.customer?.name === "John Parent (Head of Household)", "Customer name verified");

  // ============================================================================
  // TEST 2: DOCTOR / PHYSICIAN REGISTRY
  // ============================================================================
  console.log("\n--- 2. Testing Doctor & Prescriber Registry ---");

  const doctor = await clinicalAlpha.createDoctor(pharmacist.id, {
    name: "Dr. Gregory House",
    specialization: "Infectious Disease & Nephrology",
    licenseNumber: `DOC-LIC-${timestamp.toString().slice(-4)}`,
    hospitalAffiliation: "Princeton-Plainsboro Teaching Hospital",
    phone: "+1-555-0199",
    email: "house@ppth.org",
  });

  assert(doctor.id !== undefined, "Doctor created successfully");
  assert(doctor.specialization === "Infectious Disease & Nephrology", "Doctor specialization recorded");

  const doctorsList = await clinicalAlpha.listDoctors();
  assert(doctorsList.some((d) => d.id === doctor.id), "Doctor present in prescriber directory");

  // ============================================================================
  // TEST 3: PRESCRIPTION CREATION & STRICT RBAC VERIFICATION
  // ============================================================================
  console.log("\n--- 3. Testing Prescription Creation & Pharmacist RBAC Gate ---");

  // Provision Medicine (requires prescription)
  const category = await prisma.category.create({
    data: {
      tenantId: tenantAlphaId,
      name: `Antibiotics-${timestamp}`,
    },
  });

  const amoxMedicine = await prisma.medicine.create({
    data: {
      tenantId: tenantAlphaId,
      categoryId: category.id,
      sku: `MED-AMX-${timestamp.toString().slice(-4)}`,
      name: "Amoxicillin 500mg Capsule",
      strength: "500mg",
      isPrescriptionRequired: true, // CLINICAL FLAG
      reorderLevel: 10,
    },
  });

  const batchAmox = await prisma.medicineBatch.create({
    data: {
      tenantId: tenantAlphaId,
      medicineId: amoxMedicine.id,
      batchNumber: `BATCH-AMX-${timestamp.toString().slice(-4)}`,
      expiryDate: new Date("2028-12-31"),
      purchasePrice: 5.0,
      sellingPrice: 15.0,
    },
  });

  // Stock inventory ledger
  await prisma.inventoryLedger.create({
    data: {
      tenantId: tenantAlphaId,
      branchId: branchAlpha.id,
      medicineId: amoxMedicine.id,
      batchId: batchAmox.id,
      transactionType: "PURCHASE",
      quantity: 100,
    },
  });

  // Create Prescription (Status: PENDING)
  const prescription = await clinicalAlpha.createPrescription(pharmacist.id, {
    patientId: patientChild1.id,
    doctorId: doctor.id,
    prescriptionDate: new Date(),
    notes: "Take after meals, monitor for rash",
    items: [
      {
        medicineId: amoxMedicine.id,
        dosage: "500mg",
        frequency: "1x3 daily",
        duration: "5 days",
        quantityRequired: 15,
        instructions: "Take with food",
      },
    ],
  });

  assert(prescription.status === PrescriptionStatus.PENDING, "New Prescription is created with status PENDING");
  assert(prescription.verifiedById === null, "Prescription has no verifiedById initially");

  // RBAC CHECK: Cashier (without RX_VERIFY) attempts to verify prescription -> MUST FAIL
  let cashierBlocked = false;
  try {
    await clinicalAlpha.verifyPrescription(cashier.id, prescription.id);
  } catch (err: any) {
    cashierBlocked = true;
    assert(
      err.name === "AuthorizationError" || err.message?.includes("Access denied"),
      "Non-pharmacist (Cashier) blocked from verifying prescription by RBAC"
    );
  }
  assert(cashierBlocked, "RBAC strictly prevented cashier from approving prescription");

  // Pharmacist (with RX_VERIFY) verifies and approves prescription
  const verifiedRx = await clinicalAlpha.verifyPrescription(pharmacist.id, prescription.id, {
    status: "VERIFIED",
    notes: "Clinical review approved: Dosage verified against pediatric standards.",
  });

  assert(verifiedRx.status === PrescriptionStatus.VERIFIED, "Prescription successfully transitioned to VERIFIED");
  assert(verifiedRx.verifiedById === pharmacist.id, "Pharmacist user ID logged as verifiedById");
  assert(verifiedRx.verifiedAt !== null, "Verification timestamp accurately recorded");

  // ============================================================================
  // TEST 4: POS CLINICAL SAFETY & RX DISPENSING
  // ============================================================================
  console.log("\n--- 4. Testing POS Terminal Clinical Safety Gates ---");

  // SCENARIO A: Checkout Rx-required medication with NO prescription attached -> MUST BLOCK
  let noRxBlocked = false;
  try {
    await posAlpha.processSale(pharmacist.id, {
      branchId: branchAlpha.id,
      items: [
        {
          medicineId: amoxMedicine.id,
          batchId: batchAmox.id,
          quantity: 15,
          unitPrice: 15.0,
        },
      ],
      payments: [{ method: "CASH", amount: 225.0 }],
    });
  } catch (err: any) {
    noRxBlocked = true;
    assert(
      err.message?.includes("require a valid prescription"),
      "POS successfully blocked checkout of isPrescriptionRequired medicine without attached prescription"
    );
  }
  assert(noRxBlocked, "Sale was strictly blocked when prescription was omitted");

  // SCENARIO B: Checkout with a PENDING prescription -> MUST BLOCK
  const pendingRx = await clinicalAlpha.createPrescription(pharmacist.id, {
    patientId: patientChild2.id,
    doctorId: doctor.id,
    items: [
      {
        medicineId: amoxMedicine.id,
        dosage: "500mg",
        frequency: "1x3 daily",
        duration: "5 days",
        quantityRequired: 15,
      },
    ],
  });

  let pendingBlocked = false;
  try {
    await posAlpha.processSale(pharmacist.id, {
      branchId: branchAlpha.id,
      prescriptionId: pendingRx.id, // PENDING!
      items: [
        {
          medicineId: amoxMedicine.id,
          batchId: batchAmox.id,
          quantity: 15,
          unitPrice: 15.0,
        },
      ],
      payments: [{ method: "CASH", amount: 225.0 }],
    });
  } catch (err: any) {
    pendingBlocked = true;
    assert(
      err.message?.includes("Only prescriptions with status 'VERIFIED' can be dispensed"),
      "POS successfully blocked checkout with PENDING unverified prescription"
    );
  }
  assert(pendingBlocked, "Sale was strictly blocked when prescription was not VERIFIED");

  // SCENARIO C: Checkout with VERIFIED prescription -> MUST SUCCEED & TRANSITION TO DISPENSED
  const completedSale = await posAlpha.processSale(pharmacist.id, {
    branchId: branchAlpha.id,
    prescriptionId: verifiedRx.id,
    customerId: customer.id,
    items: [
      {
        medicineId: amoxMedicine.id,
        batchId: batchAmox.id,
        quantity: 15,
        unitPrice: 15.0,
      },
    ],
    payments: [{ method: "CASH", amount: 225.0 }],
  });

  assert(completedSale.id !== undefined, "Sale successfully completed with verified prescription");
  assert(completedSale.prescriptionId === verifiedRx.id, "Sale record links prescriptionId");

  // Verify Prescription was marked DISPENSED and linked to saleId
  const dispensedRx = await clinicalAlpha.getPrescription(verifiedRx.id);
  assert(dispensedRx.status === PrescriptionStatus.DISPENSED, "Prescription status automatically updated to DISPENSED");
  assert(dispensedRx.saleId === completedSale.id, "Prescription saleId accurately linked to Sale.id");

  // ============================================================================
  // TEST 5: MULTI-TENANT CLINICAL ISOLATION
  // ============================================================================
  console.log("\n--- 5. Testing Multi-Tenant Clinical Data Isolation ---");

  const clinicalBeta = new ClinicalService(tenantBetaId);

  // Tenant Beta cannot see Tenant Alpha's patients
  const betaPatients = await clinicalBeta.listPatients();
  assert(betaPatients.length === 0, "Tenant Beta cannot see Tenant Alpha patients");

  // Tenant Beta cannot see or verify Tenant Alpha's prescription
  let crossTenantRxFound = false;
  try {
    await clinicalBeta.getPrescription(verifiedRx.id);
    crossTenantRxFound = true;
  } catch {
    assert(true, "Tenant Beta cannot retrieve Tenant Alpha prescription (NotFoundError thrown)");
  }
  assert(!crossTenantRxFound, "Cross-tenant prescription retrieval safely blocked");

  // Cleanup test tenants and data
  await prisma.prescriptionItem.deleteMany({
    where: { prescription: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
  });
  await prisma.prescription.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.saleItem.deleteMany({
    where: { sale: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
  });
  await prisma.payment.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.sale.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.inventoryLedger.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.medicineBatch.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.medicine.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.category.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.patient.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.customer.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.doctor.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.shift.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.pharmacyUser.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.rolePermission.deleteMany({
    where: { role: { tenantId: { in: [tenantAlphaId, tenantBetaId] } } },
  });
  await prisma.role.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.branch.deleteMany({
    where: { tenantId: { in: [tenantAlphaId, tenantBetaId] } },
  });
  await prisma.tenant.deleteMany({
    where: { id: { in: [tenantAlphaId, tenantBetaId] } },
  });

  console.log("\n==================================================================");
  console.log("   ALL PHASE 3 CLINICAL & CRM INTEGRATION TESTS PASSED (100%)    ");
  console.log("==================================================================\n");
}

runPhase3Suite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n[SUITE_ERROR] Phase 3 Suite failed:", err);
    process.exit(1);
  });
