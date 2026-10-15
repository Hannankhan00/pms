import { PrismaClient } from "@prisma/client";
import { DEV_TENANT, DEV_BRANCH, DEV_USER } from "../lib/tenant/constants";

const prisma = new PrismaClient();

const PERMISSIONS = [
  // Medicine
  {
    code: "medicine.view",
    name: "View Medicines",
    module: "medicine",
    description: "View medicine catalog",
  },
  {
    code: "medicine.create",
    name: "Create Medicine",
    module: "medicine",
    description: "Create new medicine record",
  },
  {
    code: "medicine.update",
    name: "Update Medicine",
    module: "medicine",
    description: "Update existing medicine record",
  },
  {
    code: "medicine.delete",
    name: "Delete Medicine",
    module: "medicine",
    description: "Soft delete or deactivate medicine",
  },

  // Inventory
  {
    code: "inventory.view",
    name: "View Inventory",
    module: "inventory",
    description: "View inventory ledger and batch stock",
  },
  {
    code: "inventory.adjust",
    name: "Adjust Inventory",
    module: "inventory",
    description: "Create inventory stock adjustments",
  },
  {
    code: "inventory.transfer",
    name: "Transfer Inventory",
    module: "inventory",
    description: "Transfer stock between branches/warehouses",
  },

  // Sales / POS
  {
    code: "sales.view",
    name: "View Sales",
    module: "sales",
    description: "View sales invoices and transaction records",
  },
  {
    code: "sales.create",
    name: "Create Sale",
    module: "sales",
    description: "Process sales via POS/cash register",
  },
  {
    code: "sales.refund",
    name: "Refund Sale",
    module: "sales",
    description: "Process sale returns and refunds",
  },

  // Procurement / Purchase
  {
    code: "purchase.view",
    name: "View Purchases",
    module: "purchase",
    description: "View supplier purchase orders",
  },
  {
    code: "purchase.create",
    name: "Create Purchase",
    module: "purchase",
    description: "Create purchase orders",
  },
  {
    code: "purchase.approve",
    name: "Approve Purchase",
    module: "purchase",
    description: "Approve purchase receipt into stock",
  },

  // Users & Access
  {
    code: "users.view",
    name: "View Users",
    module: "users",
    description: "View pharmacy staff and assignments",
  },
  {
    code: "users.manage",
    name: "Manage Users",
    module: "users",
    description: "Create, update, or deactivate pharmacy users",
  },

  // IAM & Roles (Phase 2)
  {
    code: "roles.view",
    name: "View Roles",
    module: "iam",
    description: "View custom roles and assigned permissions",
  },
  {
    code: "roles.manage",
    name: "Manage Roles",
    module: "iam",
    description: "Create and modify custom roles and permissions",
  },
  {
    code: "staff.view",
    name: "View Staff",
    module: "iam",
    description: "View pharmacy staff directory and assignments",
  },
  {
    code: "staff.manage",
    name: "Manage Staff",
    module: "iam",
    description: "Invite, update, and manage pharmacy personnel",
  },

  // POS & Shifts (Phase 2)
  {
    code: "pos.access",
    name: "Access POS",
    module: "pos",
    description: "Access point-of-sale checkout and dispensing",
  },
  {
    code: "shift.view",
    name: "View Shifts",
    module: "pos",
    description: "View cashier shifts and status",
  },
  {
    code: "shift.open",
    name: "Open Shift",
    module: "pos",
    description: "Open a cashier shift with drawer float",
  },
  {
    code: "shift.close",
    name: "Close Shift",
    module: "pos",
    description: "Close cashier shift and balance drawer cash",
  },
  {
    code: "shift.manage",
    name: "Manage Shifts",
    module: "pos",
    description: "Perform cashier drops, payouts, and shift audits",
  },

  // Clinical & Patients (Phase 3)
  {
    code: "patient.view",
    name: "View Patients",
    module: "clinical",
    description: "View patient records and clinical profiles",
  },
  {
    code: "patient.create",
    name: "Create Patient",
    module: "clinical",
    description: "Register new clinical patients",
  },
  {
    code: "patient.manage",
    name: "Manage Patients",
    module: "clinical",
    description: "Modify patient records and medical histories",
  },
  {
    code: "doctor.view",
    name: "View Doctors",
    module: "clinical",
    description: "View prescribing physician registry",
  },
  {
    code: "doctor.create",
    name: "Create Doctor",
    module: "clinical",
    description: "Register verified medical prescribers",
  },
  {
    code: "doctor.manage",
    name: "Manage Doctors",
    module: "clinical",
    description: "Manage physician credentials and licensing",
  },
  {
    code: "prescription.view",
    name: "View Prescriptions",
    module: "clinical",
    description: "View prescription orders and queue",
  },
  {
    code: "prescription.create",
    name: "Create Prescription",
    module: "clinical",
    description: "Register prescription intake orders",
  },
  {
    code: "prescription.verify",
    name: "Verify Prescription",
    module: "clinical",
    description: "Pharmacist authorization and clinical approval",
  },
  {
    code: "prescription.dispense",
    name: "Dispense Prescription",
    module: "clinical",
    description: "Dispense prescribed medications at checkout",
  },
];

async function main() {
  console.log("[SEED] Starting idempotent database seed...");

  // 1. Upsert Permissions
  const permissionMap = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
      create: perm,
    });
    permissionMap.set(perm.code, p.id);
  }
  console.log(`[OK] Seeded ${permissionMap.size} permissions`);

  // 2. Upsert Development Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: DEV_TENANT.id },
    update: {
      name: DEV_TENANT.name,
      slug: DEV_TENANT.slug,
      status: DEV_TENANT.status,
    },
    create: DEV_TENANT,
  });
  console.log(`[OK] Seeded Tenant: ${tenant.name} (${tenant.id})`);

  // 3. Upsert Roles for Tenant
  const superAdminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "Super Admin",
      },
    },
    update: {
      description: "Full system access to pharmacy modules",
      isSystem: true,
    },
    create: {
      tenantId: tenant.id,
      name: "Super Admin",
      description: "Full system access to pharmacy modules",
      isSystem: true,
    },
  });

  const pharmacistRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "Pharmacist",
      },
    },
    update: {
      description: "Dispensing, medicine management, and inventory stock oversight",
      isSystem: false,
    },
    create: {
      tenantId: tenant.id,
      name: "Pharmacist",
      description: "Dispensing, medicine management, and inventory stock oversight",
      isSystem: false,
    },
  });

  const cashierRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: "Cashier",
      },
    },
    update: {
      description: "POS terminal operations and invoice processing",
      isSystem: false,
    },
    create: {
      tenantId: tenant.id,
      name: "Cashier",
      description: "POS terminal operations and invoice processing",
      isSystem: false,
    },
  });

  console.log(`[OK] Seeded Roles: Super Admin, Pharmacist, Cashier`);

  // 4. Map Permissions to Super Admin (all permissions)
  for (const [, permId] of permissionMap) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permId,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permId,
      },
    });
  }

  // Map Permissions to Pharmacist
  const pharmacistPermCodes = [
    "medicine.view",
    "medicine.create",
    "medicine.update",
    "inventory.view",
    "inventory.adjust",
    "sales.view",
  ];
  for (const code of pharmacistPermCodes) {
    const permId = permissionMap.get(code);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: pharmacistRole.id,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: pharmacistRole.id,
          permissionId: permId,
        },
      });
    }
  }

  // Map Permissions to Cashier
  const cashierPermCodes = ["medicine.view", "sales.view", "sales.create"];
  for (const code of cashierPermCodes) {
    const permId = permissionMap.get(code);
    if (permId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: cashierRole.id,
            permissionId: permId,
          },
        },
        update: {},
        create: {
          roleId: cashierRole.id,
          permissionId: permId,
        },
      });
    }
  }
  console.log(`[OK] Seeded Role-Permission mappings`);

  // 5. Upsert Main Branch
  const branch = await prisma.branch.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: DEV_BRANCH.code,
      },
    },
    update: {
      name: DEV_BRANCH.name,
      address: DEV_BRANCH.address,
      phone: DEV_BRANCH.phone,
      isActive: DEV_BRANCH.isActive,
    },
    create: {
      id: DEV_BRANCH.id,
      tenantId: tenant.id,
      code: DEV_BRANCH.code,
      name: DEV_BRANCH.name,
      address: DEV_BRANCH.address,
      phone: DEV_BRANCH.phone,
      isActive: DEV_BRANCH.isActive,
    },
  });
  console.log(`[OK] Seeded Branch: ${branch.name} (${branch.code})`);

  // 6. Upsert Development Admin User
  const user = await prisma.pharmacyUser.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: DEV_USER.email,
      },
    },
    update: {
      name: DEV_USER.name,
      hubUserId: DEV_USER.hubUserId,
      roleId: superAdminRole.id,
      isActive: DEV_USER.isActive,
    },
    create: {
      id: DEV_USER.id,
      tenantId: tenant.id,
      hubUserId: DEV_USER.hubUserId,
      roleId: superAdminRole.id,
      name: DEV_USER.name,
      email: DEV_USER.email,
      isActive: DEV_USER.isActive,
    },
  });
  console.log(`[OK] Seeded Admin User: ${user.name} (${user.email})`);

  // 7. Seed Phase 1 Clinical Taxonomy & Catalog
  const antibioticCategory = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Antibiotics" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Antibiotics",
      nameAr: "مضادات حيوية",
      nameFr: "Antibiotiques",
      nameIt: "Antibiotici",
      description: "Antimicrobial pharmaceuticals",
    },
  });

  const analgesicCategory = await prisma.category.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Analgesics & Antipyretics" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Analgesics & Antipyretics",
      nameAr: "مسكنات وخافضات حرارة",
      nameFr: "Analgésiques et Antipyrétiques",
      nameIt: "Analgesici e Antipiretici",
      description: "Pain relief and fever reduction",
    },
  });

  const capsuleForm = await prisma.dosageForm.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Capsule" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Capsule",
      nameAr: "كبسولة",
      nameFr: "Gélule",
      nameIt: "Capsula",
    },
  });

  const tabletForm = await prisma.dosageForm.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Tablet" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Tablet",
      nameAr: "قرص",
      nameFr: "Comprimé",
      nameIt: "Compressa",
    },
  });

  // Medicines
  const amox = await prisma.medicine.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: "MED-AMOX-500" } },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: "MED-AMOX-500",
      barcode: "8901234567890",
      name: "Amoxicillin 500mg",
      nameAr: "أموكسيسيلين 500 مجم",
      nameFr: "Amoxicilline 500mg",
      nameIt: "Amoxicillina 500mg",
      categoryId: antibioticCategory.id,
      dosageFormId: capsuleForm.id,
      strength: "500mg",
      reorderLevel: 25,
      isPrescriptionRequired: true,
      isNarcotic: false,
    },
  });

  const para = await prisma.medicine.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: "MED-PARA-500" } },
    update: {},
    create: {
      tenantId: tenant.id,
      sku: "MED-PARA-500",
      barcode: "8901234567891",
      name: "Paracetamol 500mg",
      nameAr: "باراسيتامول 500 مجم",
      nameFr: "Paracétamol 500mg",
      nameIt: "Paracetamolo 500mg",
      categoryId: analgesicCategory.id,
      dosageFormId: tabletForm.id,
      strength: "500mg",
      reorderLevel: 50,
      isPrescriptionRequired: false,
      isNarcotic: false,
    },
  });

  // Supplier
  const supplier = await prisma.supplier.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Medix Healthcare Ltd" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Medix Healthcare Ltd",
      contactPerson: "Dr. Sarah Jenkins",
      email: "orders@medixhealthcare.com",
      phone: "+1-800-555-0144",
      address: "420 Health Sciences Blvd, Cambridge, MA",
    },
  });

  // Initial Purchase & Stock Inflow
  const existingPo = await prisma.purchase.findFirst({
    where: { tenantId: tenant.id, invoiceNumber: "PO-DEV-2026-001" },
  });

  if (!existingPo) {
    const expiryEarly = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    const expiryLate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const purchase = await prisma.purchase.create({
      data: {
        tenantId: tenant.id,
        supplierId: supplier.id,
        branchId: branch.id,
        invoiceNumber: "PO-DEV-2026-001",
        purchaseDate: new Date(),
        status: "RECEIVED",
        totalAmount: 3750.0,
        taxAmount: 0,
        discountAmount: 0,
        notes: "Initial dispensary baseline inventory intake",
        createdBy: user.id,
      },
    });

    // Batches
    const batch1 = await prisma.medicineBatch.create({
      data: {
        tenantId: tenant.id,
        medicineId: amox.id,
        batchNumber: "AMX-2026-A1",
        expiryDate: expiryEarly,
        purchasePrice: 12.5,
        sellingPrice: 18.0,
        createdBy: user.id,
      },
    });

    const batch2 = await prisma.medicineBatch.create({
      data: {
        tenantId: tenant.id,
        medicineId: para.id,
        batchNumber: "PAR-2026-B1",
        expiryDate: expiryLate,
        purchasePrice: 4.0,
        sellingPrice: 7.5,
        createdBy: user.id,
      },
    });

    // Stock Inflow to Double-Entry Ledger
    await prisma.inventoryLedger.createMany({
      data: [
        {
          tenantId: tenant.id,
          branchId: branch.id,
          medicineId: amox.id,
          batchId: batch1.id,
          transactionType: "PURCHASE",
          quantity: 150.0,
          referenceId: purchase.id,
          referenceType: "Purchase",
          notes: "Initial inventory stocking - PO-DEV-2026-001",
          createdBy: user.id,
        },
        {
          tenantId: tenant.id,
          branchId: branch.id,
          medicineId: para.id,
          batchId: batch2.id,
          transactionType: "PURCHASE",
          quantity: 250.0,
          referenceId: purchase.id,
          referenceType: "Purchase",
          notes: "Initial inventory stocking - PO-DEV-2026-001",
          createdBy: user.id,
        },
      ],
    });
    console.log("[OK] Seeded Initial Stock & Batches into Inventory Ledger");
  }

  console.log("[SEED_SUCCESS] Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("[SEED_ERROR] Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
