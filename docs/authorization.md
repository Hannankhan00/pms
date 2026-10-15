# Authorization & Permission Architecture

## 1. Permission-Based Access Control

The PMS uses granular code-based permissions rather than hardcoded role strings (e.g. `user.role === 'ADMIN'`).

Roles are flexible collections of permissions:

- `Super Admin`
- `Pharmacist`
- `Cashier`
- `Inventory Manager`

---

## 2. Centralized Permission Registry (`lib/permissions/permissions.ts`)

To eliminate typos and prevent magic strings from scattering across the codebase, all permissions are registered as type-safe constants:

```ts
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

export async function createBranch(input: CreateBranchInput) {
  // Enforces type-safe permission code
  await requirePermission(PERMISSIONS.USERS_MANAGE, { tenantId: this.tenantId });
  // Proceed with validated business logic...
}
```

### Registered Codes:

| Domain    | Constant                         | Code                 | Description                      |
| :-------- | :------------------------------- | :------------------- | :------------------------------- |
| Medicine  | `PERMISSIONS.MEDICINE_VIEW`      | `medicine.view`      | View medicine catalog            |
| Medicine  | `PERMISSIONS.MEDICINE_CREATE`    | `medicine.create`    | Add new medicine                 |
| Medicine  | `PERMISSIONS.MEDICINE_UPDATE`    | `medicine.update`    | Edit medicine pricing/details    |
| Medicine  | `PERMISSIONS.MEDICINE_DELETE`    | `medicine.delete`    | Deactivate/remove medicine       |
| Inventory | `PERMISSIONS.INVENTORY_VIEW`     | `inventory.view`     | View inventory ledger & batches  |
| Inventory | `PERMISSIONS.INVENTORY_ADJUST`   | `inventory.adjust`   | Post inventory stock adjustments |
| Inventory | `PERMISSIONS.INVENTORY_TRANSFER` | `inventory.transfer` | Transfer stock across locations  |
| Sales     | `PERMISSIONS.SALES_VIEW`         | `sales.view`         | View sales history & invoices    |
| Sales     | `PERMISSIONS.SALES_CREATE`       | `sales.create`       | Execute POS sales transactions   |
| Sales     | `PERMISSIONS.SALES_REFUND`       | `sales.refund`       | Issue refunds & returns          |
| Purchase  | `PERMISSIONS.PURCHASE_VIEW`      | `purchase.view`      | View supplier purchase orders    |
| Purchase  | `PERMISSIONS.PURCHASE_CREATE`    | `purchase.create`    | Create purchase orders           |
| Purchase  | `PERMISSIONS.PURCHASE_APPROVE`   | `purchase.approve`   | Approve purchase delivery        |
| Users     | `PERMISSIONS.USERS_VIEW`         | `users.view`         | View pharmacy staff              |
| Users     | `PERMISSIONS.USERS_MANAGE`       | `users.manage`       | Add or update staff assignments  |

---

## 3. Role Ownership Model: System vs. Tenant Roles

The database supports both global defaults and tenant-specific customizations:

1. **System Roles (`tenantId: null`, `isSystem: true`)**:
   - Seeded and managed as global baseline templates (e.g. `OWNER`, `ADMIN`, `PHARMACIST`, `CASHIER`).
   - Immutable by individual pharmacies.
2. **Tenant-Specific Roles (`tenantId: tenant-uuid`, `isSystem: false`)**:
   - Custom roles created by a specific pharmacy (e.g. "Senior Dispensing Lead").
   - Strictly scoped to the owning tenant.
3. **Resolution Priority**:
   - `tenantDb(tenantId).role.findMany()` queries `OR: [{ tenantId }, { tenantId: null, isSystem: true }]`.
   - When a pharmacy customizes a role with the same name, the tenant-scoped role takes precedence for that pharmacy.

---

## 4. Branch-Level Authorization Model (Phase 1+)

Multi-branch pharmacy organizations require both tenant-level and branch-level boundaries:

```text
Tenant (Organization)
 ├── Branch A (Downtown)
 └── Branch B (Uptown)
```

- **All-Branch Access (`allBranches: true`)**: Owners, Regional Managers, and Admins can view and operate across all branches belonging to their tenant.
- **Branch-Restricted Access**: Cashiers, dispensers, and branch stock keepers are assigned to a primary branch (`primaryBranchId`). Any attempt to operate POS registers or transfer stock from an unauthorized branch throws `AuthorizationError("Access denied to target branch")`.
