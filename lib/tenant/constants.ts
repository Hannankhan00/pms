import { TenantStatus } from "@prisma/client";

export const DEV_TENANT = {
  id: "tenant-dev-pharmacy-1",
  name: "Development Pharmacy",
  slug: "dev-pharmacy",
  status: TenantStatus.ACTIVE,
};

export const DEV_BRANCH = {
  id: "branch-dev-main-1",
  code: "MAIN-01",
  name: "Main Branch",
  address: "123 Healthcare Ave, Suite 100",
  phone: "+1-555-0199",
  isActive: true,
};

export const DEV_USER = {
  id: "user-dev-admin-1",
  hubUserId: "dev-hub-user-1",
  name: "Development Admin",
  email: "admin@devpharmacy.local",
  isActive: true,
};
