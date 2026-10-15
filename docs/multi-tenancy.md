# Multi-Tenancy Architecture & Tenant Isolation

## 1. Principles of Tenant Isolation

Multi-tenancy in the Pharmacy Management System is enforced at every layer of the backend:

1. **Schema-Level Association**: Every tenant-owned table contains `tenantId` indexed via `@@index([tenantId])`.
2. **Centralized Data Scoping (`tenantDb`)**: Raw un-scoped queries such as `prisma.medicine.findMany()` are barred from application code. Data access flows through `tenantDb(tenantId)`.
3. **Compiler & Lint Guard**: ESLint actively forbids importing `@/lib/db/prisma` in `app/`, `components/`, and `services/`.
4. **No Client-Supplied Tenant Trust**: `tenantId` is never trusted directly from query parameters or request bodies. In production, client headers like `x-tenant-id` are rejected immediately.
5. **Cross-Tenant Guarding**: Any attempt to query, update, or delete records across tenant boundaries throws `TenantMismatchError`.
6. **Transactional Scope Propagation**: `tenantDb.transaction(...)` propagates the Prisma `TransactionClient` into the scoped database instance, guaranteeing that atomic multi-step mutations maintain strict tenant isolation and complete rollback safety.

---

## 2. Centralized Context Provider (`lib/tenant/context.ts`)

During Phase 0, the Central Hub identity system does not yet exist. A centralized mock context is provided for development and testing:

```ts
export interface TenantContext {
  tenantId: string;
  userId: string;
  hubUserId: string;
  branchId?: string;
  isMock: boolean;
}
```

### Production Security Rule

In production (`process.env.NODE_ENV === "production"`), client-supplied header overrides (`x-tenant-id`, `x-user-id`) are **strictly prohibited** and throw an `AuthenticationError`.

### Hub SSO Replacement Path

When the Central Hub identity provider is deployed:

1. `getTenantContext()` will read the HTTP-only cross-subdomain authentication cookie.
2. The Hub JWT signature will be verified using the Hub's public key (JWKS / asymmetric keys).
3. The verified `tenantId`, `hubUserId`, and entitlements will be mapped to the local `PharmacyUser` membership record.
4. Downstream services, repositories, and UI components require zero modifications.

---

## 3. Data Access Layer (`lib/tenant/tenant-db.ts`)

Instead of requiring developers to remember `where: { tenantId }`, the repository layer wraps data access in `tenantDb`:

```ts
const db = tenantDb(tenantId);

// Automatically queries: WHERE tenantId = :tenantId
const branches = await db.branch.findMany();

// Automatically assigns tenantId on insert
const newBranch = await db.branch.create({
  data: {
    name: "North Branch",
    code: "NORTH-01",
  },
});

// Atomic Transaction Preserving Tenant Scoping
await db.transaction(async (txDb) => {
  // txDb runs on the atomic transaction client and enforces tenantId
  await txDb.branch.update({ where: { id: branchId }, data: { ... } });
});
```

---

## 4. Entity Ownership Hierarchy

```text
Tenant (Organization)
   ├── Branches (branchId)
   │     ├── POS Terminals
   │     ├── Cash Registers
   │     └── Shifts
   ├── Warehouses (warehouseId)
   │     └── Storage Locations
   ├── Pharmacy Users (hubUserId mapping)
   ├── Medicines & Batches
   ├── Suppliers & Purchases
   └── Sales & Invoices
```
