# Architecture Decision Records (ADRs)

## ADR-001: Hub-and-Spoke Multi-Tenant Architecture

- **Context**: The platform will encompass multiple domain-specific vertical applications (Pharmacy, Restaurant, Hospital) anchored by a centralized authentication, billing, and tenant management service (The Hub).
- **Decision**: Implement the Pharmacy Management System as an independent Spoke application with strict multi-tenancy from Day 1.
- **Consequences**: Pharmacy modules remain decoupled from specific Hub implementations while maintaining absolute database isolation.

---

## ADR-002: MySQL + Prisma ORM

- **Context**: Pharmacy applications require ACID transactional safety across inventory, procurement, and financial ledgers.
- **Decision**: Use MySQL with Prisma ORM 6.x.
- **Consequences**: Type-safe queries, reliable schema migrations, explicit indexing on `tenantId`, and robust multi-operation transactions.

---

## ADR-003: Next.js Full-Stack Architecture (Modular Monolith)

- **Context**: Phase 0 requires a streamlined yet production-grade architecture without distributed overhead.
- **Decision**: Use Next.js App Router for both UI presentation and backend services (Route Handlers, Server Actions, Domain Services). Avoid introducing separate Express/NestJS microservices prematurely.
- **Consequences**: Unified TypeScript codebase, zero network serialization latency between UI and domain services, and straightforward deployment.

---

## ADR-004: Centralized Tenant Context & Data Access Scoping (`tenantDb`)

- **Context**: Relying on developers to remember `where: { tenantId }` on every query inevitably leads to cross-tenant data leaks.
- **Decision**: Create a centralized `getTenantContext()` provider and wrap repository queries inside `tenantDb(tenantId)`.
- **Consequences**: Automatic tenant scoping, compiler-enforced tenant boundaries, and centralized interception of cross-tenant violations.

---

## ADR-005: Ledger-Based Inventory Strategy (Architectural Rule)

- **Context**: Direct mutations on `medicine.stock` lose audit trails, fail reconciliation, and make discrepancy investigation impossible.
- **Decision**: In Phase 1 and beyond, all stock changes (purchases, sales, refunds, adjustments, transfers) must append immutable inventory ledger records.
- **Consequences**: Absolute auditability, accurate historical point-in-time valuation, and compliance with pharmaceutical regulations.

---

## ADR-006: Hub Integration Deferred to Phase 1+

- **Context**: The Central Hub does not exist yet. Building mocks scattered across the codebase would cause massive technical debt.
- **Decision**: Mock the Hub identity mapping strictly at the boundary (`lib/tenant/context.ts` and `PharmacyUser.hubUserId`).
- **Consequences**: Unblocked PMS development today; seamless switch to real Hub SSO later by modifying a single context provider.
