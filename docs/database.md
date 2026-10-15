# Database Architecture & Migration Strategy

## 1. Technology Choice

- **Database Engine**: MySQL 8.x / MariaDB (via XAMPP or Docker)
- **ORM**: Prisma ORM 6.4.1
- **Character Set**: `utf8mb4` with `utf8mb4_unicode_ci`

---

## 2. Foundational Schema (Phase 0)

Phase 0 intentionally limits models to the core tenancy and security boundary:

1. **`Tenant` (`tenants`)**: Organization identity, slug, status (`ACTIVE`, `SUSPENDED`, `INACTIVE`).
2. **`PharmacyUser` (`pharmacy_users`)**: Tenant member mapping to `hubUserId` and local `Role`.
3. **`Role` (`roles`)**: Authorization grouping, tenant-specific or system default.
4. **`Permission` (`permissions`)**: Granular action code (e.g. `medicine.view`).
5. **`RolePermission` (`role_permissions`)**: Join table between Role and Permission.
6. **`Branch` (`branches`)**: Physical branch location scoped to tenant.

---

## 3. ID, Timestamp & Soft-Delete Conventions

- **Primary Keys**: UUID strings (`@id @default(uuid())`) across all primary entities to avoid sequential enumeration attacks across tenants.
- **Timestamps**: All persistent entities record `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` stored in UTC.
- **Soft Deletion & Status**: Master entities use `isActive Boolean @default(true)`. Important financial, sales, and inventory records are permanent and never deleted destructively.

---

## 4. Indexing Strategy

- Every tenant-owned table indexes `tenantId`:
  ```prisma
  @@index([tenantId])
  ```
- Combined unique keys include `tenantId` to scope uniqueness per pharmacy:
  ```prisma
  @@unique([tenantId, email])
  @@unique([tenantId, code])
  ```

---

## 5. Migration Workflow

Production migrations use declarative Prisma migration files:

```bash
# Apply migrations in development
npx prisma migrate dev --name <migration_name>

# Regenerate Prisma Client
npx prisma generate

# Apply migrations in production CI/CD
npx prisma migrate deploy

# Run idempotent seed
npm run prisma:seed
```
