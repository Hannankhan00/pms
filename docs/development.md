# Developer Guide & Project Rules

## 1. Ten Cardinal Development Rules

1. **Every Tenant Entity Must Have `tenantId`**: Never create a table intended for a pharmacy without `tenantId`.
2. **Never Trust Client-Supplied Tenant IDs**: Always obtain `tenantId` from `getTenantContext()` on the server.
3. **No Unscoped Queries**: Never write global queries like `prisma.medicine.findMany()`. Always use `tenantDb(tenantId)`.
4. **Never Rely Solely on Frontend Route Guards**: Authorization must be enforced server-side using `requirePermission()`.
5. **No Password-Based Local Auth**: Identity is provided by `hubUserId`. Local users are tenant memberships, not independent login accounts.
6. **No Direct Inventory Mutations**: Stock changes must append ledger movements (in Phase 1+).
7. **Atomic Multi-Entity Operations**: Any operation modifying multiple financial, inventory, or order records must use transactions (`tenantDb.transaction(...)`).
8. **No Destructive Historical Deletions**: Do not delete sales, invoices, purchases, or ledger entries. Use status flags (`isActive`) for master data.
9. **No Secrets in the Browser**: Never prefix server secrets or database URLs with `NEXT_PUBLIC_`.
10. **Respect Layer Boundaries**: UI Components &rarr; Route Handlers / Actions &rarr; Services &rarr; Repositories &rarr; `tenantDb` &rarr; Prisma.

---

## 2. Common Development Commands

```bash
# Start development server
npm run dev

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint

# Format codebase with Prettier
npm run format

# Run multi-tenancy & security automated tests
npm run test:tenancy

# Run database migrations
npm run prisma:migrate

# Seed development database
npm run prisma:seed

# Production build
npm run build
```
