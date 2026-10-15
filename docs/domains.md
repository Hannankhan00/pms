# Logical Domain Boundaries (Modular Monolith)

The Pharmacy Management System (PMS) is structured as a **modular monolith** in Next.js. The application is divided into **10 logical domains**.

These are **logical boundaries within the same codebase and database**, not distributed microservices. Each domain owns its validation schemas, domain services, repositories, and UI components.

---

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        PHARMACY PMS SPOKE                              │
│                                                                        │
│   ┌─────────────────────┐                  ┌─────────────────────┐     │
│   │  Identity & Access  │                  │   Pharmacy Setup    │     │
│   │  • Tenant           │                  │   • Branch          │     │
│   │  • User             │                  │   • Warehouse       │     │
│   │  • Role & Permission│                  │   • Location        │     │
│   └──────────┬──────────┘                  └──────────┬──────────┘     │
│              │                                        │                │
│              ▼                                        ▼                │
│   ┌─────────────────────┐                  ┌─────────────────────┐     │
│   │   Product Master    │                  │  Inventory Ledger   │     │
│   │  • Medicine         │◄─────────────────┤  • Batch            │     │
│   │  • Brand / Generic  │                  │  • Ledger Movement  │     │
│   │  • Category         │                  │  • Stock Adjustment │     │
│   └─────────────────────┘                  └──────────▲──────────┘     │
│              ▲                                        │                │
│              │                                        │                │
│   ┌──────────┴──────────┐                  ┌──────────┴──────────┐     │
│   │     Procurement     │                  │     Sales & POS     │     │
│   │  • Supplier         │                  │  • Sale / Order     │     │
│   │  • Purchase Order   ├─────────────────►│  • Sale Items       │     │
│   │  • Goods Receiving  │                  │  • Cash Register/POS│     │
│   └─────────────────────┘                  └──────────┬──────────┘     │
│                                                       │                │
│   ┌─────────────────────┐                  ┌──────────▼──────────┐     │
│   │ Patients & Prescr.  │                  │ Finance & Accounting│     │
│   │  • Patient Profile  │                  │  • Payment Record   │     │
│   │  • Prescription     ├─────────────────►│  • Invoice          │     │
│   │  • Dispensing Log   │                  │  • Expense Tracking │     │
│   └─────────────────────┘                  └─────────────────────┘     │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                 Compliance, Audit & Analytics                │     │
│   │  • Controlled Substance Audit Log • Tax Reports • Movement   │     │
│   └──────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Identity & Access Domain

- **Entities**: `Tenant`, `PharmacyUser`, `Role`, `Permission`, `RolePermission`
- **Ownership**: Mapping local pharmacy staff to Hub SSO identities (`hubUserId`) and managing granular permission codes.
- **Rules**: Local users do not have standalone passwords; authentication relies on Hub SSO or mock context during Phase 0.

---

## 2. Pharmacy Setup Domain

- **Entities**: `Branch`, `Warehouse`, `StorageLocation`, `POSRegister`, `Shift`
- **Ownership**: Physical and operational topography of the pharmacy organization.
- **Rules**: Multi-branch support from Day 1. Operational entities carry both `tenantId` and `branchId`.

---

## 3. Product Master Domain

- **Entities**: `Medicine`, `GenericName`, `Manufacturer`, `Brand`, `Category`, `DosageForm`
- **Ownership**: The master catalog of all pharmaceutical items and OTC products.
- **Rules**: No direct stock counters exist in this domain. Stock lives in the Inventory Ledger.

---

## 4. Inventory Ledger Domain (Mandatory Ledger Rule)

- **Entities**: `MedicineBatch`, `InventoryMovement`, `StockLevel`, `StockAdjustment`, `StockTransfer`
- **Ownership**: Batch lot tracking, expiration management, and immutable stock movement ledgers.
- **Rules**:
  - `InventoryMovement` is append-only and immutable.
  - Movement types: `PURCHASE`, `SALE`, `RETURN`, `TRANSFER`, `ADJUSTMENT`, `EXPIRY`, `DAMAGE`, `DISPOSAL`.
  - Batch operational quantity is derived and validated against ledger transactions.

---

## 5. Procurement Domain

- **Entities**: `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceiptNote`
- **Ownership**: Supplier catalogs, purchasing workflows, approval tiers, and receiving inspection.
- **Rules**: Receiving goods triggers an atomic inventory movement inside `tenantDb.transaction(...)`.

---

## 6. Sales & POS Domain

- **Entities**: `Sale`, `SaleItem`, `Payment`, `SaleRefund`, `CashDrawerTransaction`
- **Ownership**: Over-the-counter POS terminal sales, prescription dispensing billing, and customer invoices.
- **Rules**: A sale is an atomic operation: Create Sale + Items + Payment + Deduct Inventory Movement in a single transaction.

---

## 7. Patients Domain

- **Entities**: `Patient`, `PatientAllergy`, `PatientMedicalHistory`
- **Ownership**: Customer/patient health profiles, emergency contacts, allergy warnings.
- **Rules**: Strictly isolated per tenant. No cross-pharmacy patient profile sharing without explicit consent protocols.

---

## 8. Prescriptions Domain

- **Entities**: `Prescription`, `PrescriptionItem`, `DispensingRecord`, `PrescriberDoctor`
- **Ownership**: Doctor prescription validation, controlled substance tracking, dosage checks, and dispensing verification.
- **Rules**: Dispensed items link directly to the sales checkout transaction and inventory batch tracking.

---

## 9. Finance & Accounts Domain

- **Entities**: `PaymentTransaction`, `PaymentMethod`, `Expense`, `TaxRate`, `FinancialLedgerEntry`
- **Ownership**: Revenue collection, operational expenses, payment gateway reconciliations, and tax accounting.
- **Rules**: Historical financial records are permanent and never deleted destructively.

---

## 10. Compliance & Audit Domain

- **Entities**: `AuditEvent`, `ControlledSubstanceLog`, `SystemNotification`
- **Ownership**: Regulatory compliance logging, price-change histories, narcotic registry records, and access monitoring.
- **Rules**: All sensitive clinical and monetary mutations automatically append structured audit entries.
