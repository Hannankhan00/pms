/**
 * Central Permission Registry for the Pharmacy Management System (PMS).
 * Centralizes all granular permission codes to prevent manual string typing and spelling errors.
 */
export const PERMISSIONS = {
  // Medicine Master Domain
  MEDICINE_VIEW: "medicine.view",
  MEDICINE_CREATE: "medicine.create",
  MEDICINE_UPDATE: "medicine.update",
  MEDICINE_DELETE: "medicine.delete",

  // Inventory Ledger Domain
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_TRANSFER: "inventory.transfer",
  INVENTORY_MANAGE: "inventory.manage",

  // Sales & POS Domain
  POS_ACCESS: "pos.access",
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_REFUND: "sales.refund",

  // Shift & Cash Management Domain
  SHIFT_VIEW: "shift.view",
  SHIFT_OPEN: "shift.open",
  SHIFT_CLOSE: "shift.close",
  SHIFT_MANAGE: "shift.manage",

  // Procurement & Supplier Domain
  PURCHASE_VIEW: "purchase.view",
  PURCHASE_CREATE: "purchase.create",
  PURCHASE_APPROVE: "purchase.approve",
  SUPPLIER_VIEW: "supplier.view",
  SUPPLIER_MANAGE: "supplier.manage",

  // Clinical & Patients
  PATIENT_VIEW: "patient.view",
  PATIENT_CREATE: "patient.create",
  PATIENT_MANAGE: "patient.manage",
  DOCTOR_VIEW: "doctor.view",
  DOCTOR_CREATE: "doctor.create",
  DOCTOR_MANAGE: "doctor.manage",
  PRESCRIPTION_VIEW: "prescription.view",
  PRESCRIPTION_CREATE: "prescription.create",
  PRESCRIPTION_VERIFY: "prescription.verify",
  RX_VERIFY: "prescription.verify",
  PRESCRIPTION_DISPENSE: "prescription.dispense",

  // Finance & Accounting Domain
  FINANCE_VIEW: "finance.view",
  FINANCE_MANAGE: "finance.manage",
  EXPENSE_VIEW: "expense.view",
  EXPENSE_CREATE: "expense.create",
  PAYABLES_MANAGE: "payables.manage",
  RECEIVABLES_MANAGE: "receivables.manage",

  // IAM: Roles, Permissions & Staff
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",

  // Reports & Analytics Domain
  REPORTS_VIEW: "reports.view",
  REPORTS_MANAGE: "reports.manage",

  // Compliance & Regulatory Audit Domain
  AUDIT_VIEW: "audit.view",
  COMPLIANCE_MANAGE: "compliance.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Array.from(new Set(Object.values(PERMISSIONS)));
