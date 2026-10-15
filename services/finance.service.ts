import { FinanceRepository } from "../repositories/finance.repository";
import {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
  RecordSupplierPaymentInput,
  RecordCustomerPaymentInput,
} from "../validations/finance.schema";
import { requirePermission } from "../lib/permissions/permission-service";
import { PERMISSIONS } from "../lib/permissions/permissions";
import { ValidationError, NotFoundError } from "../lib/errors";

export class FinanceService {
  private readonly repository: FinanceRepository;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.repository = new FinanceRepository(tenantId);
  }

  // ============================================================================
  // EXPENSE CATEGORIES
  // ============================================================================

  async createExpenseCategory(userId: string, data: CreateExpenseCategoryInput) {
    await requirePermission(PERMISSIONS.FINANCE_MANAGE, { tenantId: this.tenantId, userId });
    return this.repository.createExpenseCategory(data, userId);
  }

  async getExpenseCategories() {
    return this.repository.findExpenseCategories();
  }

  // ============================================================================
  // EXPENSES
  // ============================================================================

  async createExpense(userId: string, data: CreateExpenseInput) {
    await requirePermission(PERMISSIONS.FINANCE_MANAGE, { tenantId: this.tenantId, userId });

    const category = await this.repository.findExpenseCategoryById(data.categoryId);
    if (!category) {
      throw new NotFoundError("Expense category not found");
    }

    if (data.amount <= 0) {
      throw new ValidationError("Expense amount must be positive");
    }

    return this.repository.createExpense(data, userId);
  }

  async getExpenses(params?: {
    categoryId?: string;
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    return this.repository.findExpenses(params);
  }

  async reverseExpense(userId: string, id: string, reason: string) {
    await requirePermission(PERMISSIONS.FINANCE_MANAGE, { tenantId: this.tenantId, userId });

    if (!reason || reason.trim().length < 3) {
      throw new ValidationError("A detailed reversal reason is required");
    }

    return this.repository.reverseExpense(id, reason, userId);
  }

  // ============================================================================
  // ACCOUNTS PAYABLE
  // ============================================================================

  async getPayables() {
    const suppliers = await this.repository.findSuppliersWithPayables();

    return suppliers.map((s: any) => {
      const unpaidInvoices = s.purchases.filter(
        (p: any) => Number(p.totalAmount) - Number(p.paidAmount) > 0.001
      );

      const totalUnpaid = unpaidInvoices.reduce(
        (acc: number, p: any) => acc + (Number(p.totalAmount) - Number(p.paidAmount)),
        0
      );

      return {
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson,
        phone: s.phone,
        email: s.email,
        currentBalance: Number(s.currentBalance),
        unpaidInvoicesCount: unpaidInvoices.length,
        totalUnpaidCalculated: totalUnpaid,
        purchases: s.purchases,
      };
    });
  }

  async paySupplier(userId: string, data: RecordSupplierPaymentInput) {
    await requirePermission(PERMISSIONS.FINANCE_MANAGE, { tenantId: this.tenantId, userId });

    if (data.amount <= 0) {
      throw new ValidationError("Payment amount must be greater than zero");
    }

    return this.repository.recordSupplierPayment({
      supplierId: data.supplierId,
      amount: data.amount,
      method: data.method,
      referenceNumber: data.referenceNumber,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes,
      invoices: data.invoices,
      userId,
    });
  }

  // ============================================================================
  // ACCOUNTS RECEIVABLE
  // ============================================================================

  async getReceivables() {
    const customers = await this.repository.findCustomersWithReceivables();

    return customers.map((c: any) => {
      const unpaidSales = c.sales.filter(
        (s: any) => Number(s.totalAmount) - Number(s.paidAmount) > 0.001
      );

      const totalUnpaid = unpaidSales.reduce(
        (acc: number, s: any) => acc + (Number(s.totalAmount) - Number(s.paidAmount)),
        0
      );

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        creditLimit: Number(c.creditLimit),
        currentBalance: Number(c.currentBalance),
        unpaidSalesCount: unpaidSales.length,
        totalUnpaidCalculated: totalUnpaid,
        sales: c.sales,
      };
    });
  }

  async receiveCustomerPayment(userId: string, data: RecordCustomerPaymentInput) {
    await requirePermission(PERMISSIONS.FINANCE_MANAGE, { tenantId: this.tenantId, userId });

    if (data.amount <= 0) {
      throw new ValidationError("Receipt amount must be greater than zero");
    }

    return this.repository.recordCustomerPayment({
      customerId: data.customerId,
      amount: data.amount,
      method: data.method,
      referenceNumber: data.referenceNumber,
      date: data.date ? new Date(data.date) : new Date(),
      notes: data.notes,
      invoices: data.invoices,
      userId,
    });
  }
}
