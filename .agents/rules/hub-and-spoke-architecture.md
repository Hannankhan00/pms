# PROJECT CONTEXT & ARCHITECTURE RULES: Hub-and-Spoke SaaS Platform

## 1. The Grand Vision

We are building a Hub-and-Spoke Multi-Tenant SaaS platform.

- **The Hub (api.something.com):** Centralized identity provider, billing (Stripe), and tenant provisioning.
- **The Spokes (\*.something.com):** Independent service applications (Pharmacy, Restaurant, Hospital, etc.).
- **Architecture:** Turborepo monorepo with separate Next.js apps for the Hub and each Spoke. Database-per-service model. Shared cross-subdomain authentication via JWT cookies.

## 2. Current Focus: Pharmacy Management System (PMS)

We are currently building the first spoke: The Pharmacy Management System. The Hub does not exist yet, but the PMS MUST be built with strict multi-tenancy from Day 1 to ensure seamless integration later.

## 3. Strict Database & Development Rules (CRITICAL)

When writing code, schemas, or API routes for the PMS, ALWAYS adhere to the following rules:

- **Tenant Isolation:** Every table/collection belonging to a specific pharmacy (e.g., Medicines, Sales, Invoices, Staff) MUST include a `tenantId` field.
- **Never Write Global Queries:** Never write a query like `findMany()` without a `where` clause. Every single database query MUST be filtered by the active `tenantId` (e.g., `where: { tenantId: currentTenant }`) to prevent cross-tenant data leaks.
- **Identity Mapping:** The PMS user table MUST include a `hubUserId` string field. This will eventually map the local staff member to their global identity on the Hub. Do not build a standalone password-based auth system for the PMS; we will rely on SSO from the Hub.
- **Mocking the Hub (Temporary):** Until the Hub is built, use a custom middleware to inject a hardcoded `tenantId` (e.g., "test-tenant-1") and `hubUserId` into the session/requests to allow uninterrupted development.
