# PharmSpoke — Multi-Tenant Pharmacy Management System (PMS)

> **Phase 0 — Architecture & Foundation**
> Production-grade foundation for a multi-tenant Pharmacy Management System built as the first spoke application within a Hub-and-Spoke SaaS ecosystem.

---

## 1. Project Overview

**PharmSpoke PMS** is an enterprise B2B Pharmacy Management System designed for pharmacy owners, pharmacists, inventory managers, cashiers, and administrative staff.

It is engineered from Day 1 with **strict multi-tenancy**, centralized data isolation, and a clean **modular monolith** structure in Next.js, allowing independent operation today and seamless integration with the central SaaS Hub (identity, billing, tenant provisioning) in future phases.

---

## 2. Hub-and-Spoke Ecosystem Architecture

```text
                         ┌────────────────────────┐
                         │      CENTRAL HUB       │
                         │   (api.something.com)  │
                         │                        │
                         │ • Global Identity      │
                         │ • Tenant Provisioning  │
                         │ • Stripe Subscriptions │
                         │ • Module Entitlements  │
                         └───────────┬────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
       ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
       │  Pharmacy   │        │ Restaurant  │        │  Hospital   │
       │     PMS     │        │     RMS     │        │     HMS     │
       │ (This Spoke)│        │             │        │             │
       └─────────────┘        └─────────────┘        └─────────────┘
```

- **Central Hub**: Owns global user identity, tenant provisioning, Stripe subscriptions, and cross-subdomain SSO.
- **Pharmacy Spoke (This App)**: Independent service application with a database-per-service model. Uses a mock identity handshake in Phase 0 and strictly enforces multi-tenancy locally.

---

## 3. Technology Stack

- **Framework**: Next.js 16 (App Router, Server Components, Route Handlers)
- **Language**: TypeScript (Strict mode enabled)
- **Database**: MySQL 8.x
- **ORM**: Prisma ORM 6.4.1
- **Styling**: Tailwind CSS & shadcn/ui primitives
- **Validation**: Zod
- **Forms**: React Hook Form + `@hookform/resolvers`
- **Icons**: Lucide React
- **Code Quality**: ESLint, Prettier, TypeScript Compiler

---

## 4. Project Structure

```text
pms/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx         # Phase 0 Hub SSO auth shell
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Main executive dashboard
│   │   │   └── branches/page.tsx  # Pharmacy branches view
│   │   └── layout.tsx             # Shared dashboard shell with Topbar & Sidebar
│   ├── api/
│   │   └── branches/route.ts      # Example protected tenant-scoped API route
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                   # Redirects to /dashboard
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx            # Enterprise navigation & active tenant badge
│   │   └── topbar.tsx             # Active branch, user identity & Hub status
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── docs/
│   ├── architecture.md            # Hub-and-Spoke & modular monolith layers
│   ├── authorization.md           # Permission-based access control
│   ├── database.md                # Prisma models, indexing & migrations
│   ├── decisions.md               # ADR-001 through ADR-006
│   ├── development.md             # Development guidelines & rules
│   └── multi-tenancy.md           # Tenant isolation & tenantDb patterns
├── lib/
│   ├── config/                    # Zod-validated environment config
│   ├── db/                        # Shared Prisma Client singleton
│   ├── errors/                    # Domain AppError classes & API response sanitizers
│   ├── logging/                   # Structured, secret-redacted logger
│   ├── permissions/               # Server-side requirePermission() guards
│   ├── tenant/
│   │   ├── constants.ts           # Development mock tenant & user identifiers
│   │   ├── context.ts             # Centralized getTenantContext() provider
│   │   └── tenant-db.ts           # Centralized tenantDb() isolation client
│   └── utils.ts                   # Tailwind cn() helper
├── prisma/
│   ├── migrations/                # Version-controlled SQL migrations
│   ├── schema.prisma              # Foundational schema (Tenant, User, Role, Branch)
│   └── seed.ts                    # Idempotent development seed script
├── repositories/                  # Tenant-isolated data access layer
├── services/                      # Business logic, permissions & validation
├── tests/
│   └── tenancy.test.ts            # Automated multi-tenancy & isolation test suite
├── validations/                   # Server-side Zod input schemas
├── .env.example
├── .gitignore
├── .prettierrc
├── package.json
└── tsconfig.json
```

---

## 5. Prerequisites

- **Node.js**: v20+ or v24+
- **MySQL**: 8.0+ running on port `3306` (e.g. via XAMPP, native service, or Docker)

---

## 6. Environment Setup

Create `.env` from the provided `.env.example`:

```bash
cp .env.example .env
```

Configure your local MySQL credentials:

```env
DATABASE_URL="mysql://root:@localhost:3306/pharmacy_pms"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Future Hub Integration Placeholders (Deferred until Hub deployment)
HUB_API_URL="https://api.example.com"
HUB_INTERNAL_API_KEY="dev-placeholder-hub-key"
```

---

## 7. Database Initialization, Migration & Seed

Ensure your MySQL server is running, then run:

```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations to database
npm run prisma:migrate

# Seed development tenant, branch, roles, permissions, and admin user
npm run prisma:seed
```

The seed script is **fully idempotent** and creates:

- **Tenant**: `Development Pharmacy` (`tenant-dev-pharmacy-1`)
- **Branch**: `Main Branch` (`MAIN-01`)
- **Roles**: `Super Admin`, `Pharmacist`, `Cashier`
- **Permissions**: 15 domain codes (`medicine.*`, `inventory.*`, `sales.*`, `purchase.*`, `users.*`)
- **Admin User**: `Development Admin` mapped to Hub ID `dev-hub-user-1`

---

## 8. Development & Testing Commands

```bash
# Start Next.js development server
npm run dev

# Run TypeScript compiler check (noEmit)
npm run typecheck

# Run ESLint validation
npm run lint

# Format code with Prettier
npm run format

# Verify code formatting
npm run format:check

# Run automated multi-tenancy & security test suite
npm run test:tenancy

# Run production build
npm run build
```

---

## 9. Multi-Tenancy & Security Rules

1. **Tenant Isolation**: Every tenant-owned record has a `tenantId` foreign key and is indexed (`@@index([tenantId])`).
2. **Zero Global Queries**: All data access is wrapped by `tenantDb(tenantId)`. Never call unscoped Prisma queries directly in services or UI.
3. **Identity Mapping**: The local user table links via `hubUserId`. Local users are tenant memberships, not independent login accounts.
4. **Server-Side Authorization**: Permissions are checked server-side via `requirePermission()`. Never rely only on client-side UI toggles.
5. **Ledger-Based Inventory**: Stock changes must append immutable ledger movements rather than mutative field edits.
6. **Atomic Transactions**: Multi-entity financial and stock updates must use `tenantDb.transaction(...)`.

---

## 10. Future Hub Integration Transition

When the central Hub is deployed, transitioning from the Phase 0 mock identity to production SSO requires **modifying only one file** (`lib/tenant/context.ts`):

```text
CURRENT (Phase 0):
Mock Context ───► getTenantContext() ───► PMS Services & Repositories

FUTURE:
Hub SSO JWT ────► getTenantContext() ───► PMS Services & Repositories
```

Zero changes will be required in business services, repositories, or UI components.
