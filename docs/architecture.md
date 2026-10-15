# Hub-and-Spoke SaaS Architecture — Pharmacy Management System (PMS)

## 1. Ecosystem Vision

The multi-tenant software platform is structured under a **Hub-and-Spoke Architecture**:

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

The Pharmacy Management System (PMS) is the **first spoke application**. While the central Hub is scheduled for subsequent development, the PMS is built with strict multi-tenancy from Day 1 to ensure zero-friction integration when the Hub comes online.

---

## 2. Layered Modular Monolith Architecture

The PMS follows a clean, decoupled **modular monolith** design inside Next.js App Router:

```text
HTTP Request / UI
       │
       ▼
┌──────────────────────────────────────────────┐
│ Next.js App Router (Routes / Server Actions) │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Security & Context Boundary                  │
│ • Authentication (getTenantContext)          │
│ • Permission Authorization (requirePermission)│
│ • Input Validation (Zod Schemas)             │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Service Layer (Business Logic & Rules)       │
│ • Domain workflows & validations             │
│ • Atomic multi-entity transactions           │
│ • Structured logging & audit readiness       │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Repository Layer (Tenant-Scoped Data Access) │
│ • tenantDb(tenantId) abstraction             │
│ • Guaranteed 'where: { tenantId }' injection │
│ • Zero cross-tenant data leaks               │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ Prisma ORM & MySQL Database                  │
└──────────────────────────────────────────────┘
```

---

## 3. Core Boundaries

1. **Components (`components/`)**: Pure UI and presentation. No direct database queries or heavy business logic.
2. **Server Endpoints (`app/api/` & Server Actions)**: Handles request parsing, context extraction, invoking services, and standard error handling.
3. **Services (`services/`)**: Enforces permissions, validates business rules, orchestrates transactions, and returns domain models.
4. **Repositories (`repositories/`)**: Encapsulates persistence logic. Exclusively uses `tenantDb(tenantId)` to enforce tenant isolation.
5. **Database (`prisma/`)**: Schema definitions, indexes, migrations, and seed scripts.
