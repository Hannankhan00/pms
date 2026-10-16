import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { provisionTenantSchema } from "@/validations/tenant.schema";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions/permissions";
import { createSuccessResponse, createErrorResponse } from "@/lib/errors/app-error";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate using HUB_INTERNAL_API_KEY
    const authHeader = req.headers.get("authorization");
    const configuredApiKey = process.env.HUB_INTERNAL_API_KEY;

    if (!configuredApiKey || !authHeader || authHeader !== `Bearer ${configuredApiKey}`) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Missing or invalid Hub internal API key",
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    const body = await req.json();
    const validated = provisionTenantSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid tenant provisioning payload",
            details: validated.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { hubTenantId, name, adminHubUserId, adminEmail, adminName } = validated.data;

    // 3. Prevent duplicate tenant provisioning
    const existing = await prisma.tenant.findUnique({
      where: { hubTenantId },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: `Tenant with Hub ID '${hubTenantId}' is already provisioned`,
          },
        },
        { status: 409 }
      );
    }

    // 4. Generate unique slug
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = "pharmacy";
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // 5. Execute transactional tenant bootstrap
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          hubTenantId,
          name,
          slug,
          status: "ACTIVE",
          subscriptionStatus: "ACTIVE",
          defaultLocale: "en",
          defaultCurrency: "USD",
        },
      });

      // Step B: Create Main Branch (Headquarters)
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: "Headquarters",
          code: "HQ-01",
          isMain: true,
          isActive: true,
        },
      });

      // Step C: Ensure Permission Registry exists in DB
      const existingPerms = await tx.permission.findMany({
        select: { id: true, code: true },
      });
      const permMap = new Map<string, string>();
      for (const p of existingPerms) {
        permMap.set(p.code, p.id);
      }

      for (const code of ALL_PERMISSIONS) {
        if (!permMap.has(code)) {
          const newPerm = await tx.permission.create({
            data: {
              code,
              name: code
                .split(".")
                .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
                .join(" "),
              module: code.split(".")[0],
            },
          });
          permMap.set(code, newPerm.id);
        }
      }

      // Step D: Create Standard System Roles
      const ownerRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "OWNER",
          description: "Full clinical ownership and operational control",
          isSystem: true,
        },
      });

      const pharmacistRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "PHARMACIST",
          description: "Clinical verification, inventory stewardship, and dispensing",
          isSystem: false,
        },
      });

      const cashierRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "CASHIER",
          description: "Point of sale transactions and cashier register management",
          isSystem: false,
        },
      });

      // Step E: Map Permissions to Roles
      // OWNER receives all system permissions
      const allPermEntries = Array.from(permMap.values()).map((permissionId) => ({
        roleId: ownerRole.id,
        permissionId,
      }));
      await tx.rolePermission.createMany({
        data: allPermEntries,
        skipDuplicates: true,
      });

      // PHARMACIST receives clinical, inventory, catalog, and sales permissions
      const pharmacistPermCodes: string[] = [
        PERMISSIONS.MEDICINE_VIEW,
        PERMISSIONS.MEDICINE_CREATE,
        PERMISSIONS.MEDICINE_UPDATE,
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INVENTORY_ADJUST,
        PERMISSIONS.INVENTORY_TRANSFER,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.PRESCRIPTION_VIEW,
        PERMISSIONS.PRESCRIPTION_CREATE,
        PERMISSIONS.PRESCRIPTION_VERIFY,
        PERMISSIONS.PRESCRIPTION_DISPENSE,
        PERMISSIONS.PATIENT_VIEW,
        PERMISSIONS.PATIENT_CREATE,
        PERMISSIONS.DOCTOR_VIEW,
        PERMISSIONS.REPORTS_VIEW,
      ];
      const pharmacistPermEntries = pharmacistPermCodes
        .map((code) => permMap.get(code))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({
          roleId: pharmacistRole.id,
          permissionId,
        }));
      await tx.rolePermission.createMany({
        data: pharmacistPermEntries,
        skipDuplicates: true,
      });

      // CASHIER receives POS, cash sales, and catalog view permissions
      const cashierPermCodes: string[] = [
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SHIFT_VIEW,
        PERMISSIONS.SHIFT_OPEN,
        PERMISSIONS.SHIFT_CLOSE,
        PERMISSIONS.MEDICINE_VIEW,
        PERMISSIONS.PATIENT_VIEW,
        PERMISSIONS.PATIENT_CREATE,
      ];
      const cashierPermEntries = cashierPermCodes
        .map((code) => permMap.get(code))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({
          roleId: cashierRole.id,
          permissionId,
        }));
      await tx.rolePermission.createMany({
        data: cashierPermEntries,
        skipDuplicates: true,
      });

      // Step F: Create Root PharmacyUser mapped to adminHubUserId
      const adminUser = await tx.pharmacyUser.create({
        data: {
          tenantId: tenant.id,
          hubUserId: adminHubUserId,
          roleId: ownerRole.id,
          branchId: branch.id,
          name: adminName,
          email: adminEmail,
          locale: "en",
          isActive: true,
        },
      });

      // Step G: Seed Default Pharmaceutical Categories
      const categories = [
        {
          name: "General",
          nameAr: "عام",
          nameFr: "Général",
          nameIt: "Generale",
          description: "Over-the-counter and general healthcare essentials",
        },
        {
          name: "Syrups",
          nameAr: "شراب",
          nameFr: "Sirops",
          nameIt: "Sciroppi",
          description: "Liquid oral suspensions, solutions, and syrups",
        },
        {
          name: "Tablets",
          nameAr: "أقراص",
          nameFr: "Comprimés",
          nameIt: "Compresse",
          description: "Solid dosage oral formulations and compressed tablets",
        },
        {
          name: "Antibiotics",
          nameAr: "مضادات حيوية",
          nameFr: "Antibiotiques",
          nameIt: "Antibiotici",
          description: "Bacterial therapeutics requiring prescription control",
        },
        {
          name: "Analgesics",
          nameAr: "مسكنات",
          nameFr: "Analgésiques",
          nameIt: "Analgesici",
          description: "Anti-inflammatory and pain relief therapeutics",
        },
      ];

      await tx.category.createMany({
        data: categories.map((cat) => ({
          tenantId: tenant.id,
          ...cat,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      return { tenant, branch, adminUser, ownerRole };
    });

    return NextResponse.json(
      createSuccessResponse({
        tenant: {
          id: result.tenant.id,
          hubTenantId: result.tenant.hubTenantId,
          name: result.tenant.name,
          slug: result.tenant.slug,
          subscriptionStatus: result.tenant.subscriptionStatus,
        },
        branch: {
          id: result.branch.id,
          name: result.branch.name,
          code: result.branch.code,
        },
        adminUser: {
          id: result.adminUser.id,
          hubUserId: result.adminUser.hubUserId,
          email: result.adminUser.email,
          name: result.adminUser.name,
          role: result.ownerRole.name,
        },
      }),
      { status: 201 }
    );
  } catch (error) {
    const { statusCode, body } = createErrorResponse(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
