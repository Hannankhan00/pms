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
  PRESCRIPTION_VIEW: "prescription.view",
  PRESCRIPTION_CREATE: "prescription.create",

  // IAM: Roles, Permissions & Staff
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);
