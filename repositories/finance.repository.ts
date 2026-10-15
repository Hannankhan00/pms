import { tenantDb } from "../lib/tenant/tenant-db";
import { prisma } from "../lib/db/prisma";
import {
  CreateExpenseCategoryInput,
  CreateExpenseInput,
} from "../validations/finance.schema";
import {
  ExpenseCategory,
  Expense,
  Payment,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  AccountType,
  Prisma,
} from "@prisma/client";

export class FinanceRepository {
  private readonly db;
  private readonly tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.db = tenantDb(tenantId);
  }

  // ============================================================================
  // EXPENSE CATEGORIES
  // ============================================================================

  async createExpenseCategory(data: CreateExpenseCategoryInput, userId?: string): Promise<ExpenseCategory> {
    return this.db.expenseCategory.create({
      data: {
        tenantId: this.tenantId,
        name: data.name,
        description: data.description || null,
        createdBy: userId,
      },
    });
  }

  async findExpenseCategories(): Promise<ExpenseCategory[]> {
    return this.db.expenseCategory.findMany({
      orderBy: { name: "asc" },
    });
  }

  async findExpenseCategoryById(id: string): Promise<ExpenseCategory | null> {
    return this.db.expenseCategory.findFirst({
      where: { id },
    });
  }

  // ============================================================================
  // EXPENSES & IMMUTABLE LEDGER
  // ============================================================================

  async createExpense(data: CreateExpenseInput, userId?: string): Promise<Expense> {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          tenantId: this.tenantId,
          categoryId: data.categoryId,
          branchId: data.branchId || null,
          amount: new Prisma.Decimal(data.amount.toString()),
          date: data.date ? new Date(data.date) : new Date(),
          description: data.description,
          receiptUrl: data.receiptUrl || null,
          paymentMethod: data.paymentMethod,
          recordedById: userId,
          createdBy: userId,
        },
        include: {
          category: true,
          branch: true,
          recordedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Double-entry Account Ledger Entry (Debit Operating Expense, Credit Cash/Bank)
      const creditAccount =
        data.paymentMethod === PaymentMethod.BANK_TRANSFER || data.paymentMethod === PaymentMethod.CHEQUE
          ? AccountType.BANK
          : AccountType.CASH_DRAWER;

      // 1. Debit Expense
      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: AccountType.OPERATING_EXPENSE,
          entityType: "EXPENSE",
          entityId: expense.id,
          debit: expense.amount,
          credit: new Prisma.Decimal(0),
          balanceAfter: expense.amount,
          referenceType: "EXPENSE",
          referenceId: expense.id,
          expenseId: expense.id,
          description: `Operating expense: ${data.description}`,
          date: expense.date,
          createdBy: userId,
        },
      });

      // 2. Credit Cash / Bank
      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: creditAccount,
          entityType: "EXPENSE",
          entityId: expense.id,
          debit: new Prisma.Decimal(0),
          credit: expense.amount,
          balanceAfter: new Prisma.Decimal(0).minus(expense.amount),
          referenceType: "EXPENSE",
          referenceId: expense.id,
          expenseId: expense.id,
          description: `Disbursement for expense: ${data.description}`,
          date: expense.date,
          createdBy: userId,
        },
      });

      return expense;
    });
  }

  async findExpenses(params?: {
    categoryId?: string;
    branchId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.ExpenseWhereInput = {
      isDeleted: false,
    };

    if (params?.categoryId) where.categoryId = params.categoryId;
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.startDate || params?.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = params.startDate;
      if (params.endDate) where.date.lte = params.endDate;
    }

    return this.db.expense.findMany({
      where,
      include: {
        category: true,
        branch: { select: { id: true, name: true, code: true } },
        recordedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: "desc" },
      take: params?.limit || 100,
      skip: params?.offset || 0,
    });
  }

  async findExpenseById(id: string): Promise<Expense | null> {
    return this.db.expense.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: true,
        branch: true,
        recordedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Reverses an expense rather than deleting it, enforcing Financial Immutability.
   */
  async reverseExpense(id: string, reason: string, userId?: string): Promise<Expense> {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: { id, tenantId: this.tenantId, isDeleted: false },
      });

      if (!expense) {
        throw new Error("Expense not found");
      }

      if (expense.isReversed) {
        throw new Error("Expense has already been reversed");
      }

      const updated = await tx.expense.update({
        where: { id },
        data: {
          isReversed: true,
          reversedAt: new Date(),
          reversalReason: reason,
          updatedBy: userId,
        },
      });

      // Compensating Double-Entry Reversal
      const creditAccount =
        expense.paymentMethod === PaymentMethod.BANK_TRANSFER || expense.paymentMethod === PaymentMethod.CHEQUE
          ? AccountType.BANK
          : AccountType.CASH_DRAWER;

      // Reverse: Credit Operating Expense
      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: AccountType.OPERATING_EXPENSE,
          entityType: "EXPENSE",
          entityId: expense.id,
          debit: new Prisma.Decimal(0),
          credit: expense.amount,
          balanceAfter: new Prisma.Decimal(0),
          referenceType: "EXPENSE_REVERSAL",
          referenceId: expense.id,
          expenseId: expense.id,
          description: `Reversal of expense #${expense.id.slice(0, 8)}: ${reason}`,
          date: new Date(),
          createdBy: userId,
        },
      });

      // Reverse: Debit Cash / Bank
      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: creditAccount,
          entityType: "EXPENSE",
          entityId: expense.id,
          debit: expense.amount,
          credit: new Prisma.Decimal(0),
          balanceAfter: expense.amount,
          referenceType: "EXPENSE_REVERSAL",
          referenceId: expense.id,
          expenseId: expense.id,
          description: `Compensating cash entry for reversal of expense #${expense.id.slice(0, 8)}: ${reason}`,
          date: new Date(),
          createdBy: userId,
        },
      });

      return updated;
    });
  }

  // ============================================================================
  // ACCOUNTS PAYABLE (Supplier Invoices & Payments)
  // ============================================================================

  async findSuppliersWithPayables() {
    return this.db.supplier.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        purchases: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            invoiceNumber: true,
            purchaseDate: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
          orderBy: { purchaseDate: "asc" },
        },
      },
      orderBy: { currentBalance: "desc" },
    });
  }

  async findUnpaidPurchasesBySupplier(supplierId: string) {
    return this.db.purchase.findMany({
      where: {
        supplierId,
        isDeleted: false,
      },
      orderBy: { purchaseDate: "asc" },
    });
  }

  async recordSupplierPayment(params: {
    supplierId: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber?: string | null;
    date?: Date;
    notes?: string | null;
    invoices?: Array<{ purchaseId: string; amount: number }>;
    userId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: params.supplierId, tenantId: this.tenantId, isDeleted: false },
      });

      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const totalPaymentAmount = new Prisma.Decimal(params.amount.toString());

      // 1. Create Immutable Payment Record
      const payment = await tx.payment.create({
        data: {
          tenantId: this.tenantId,
          type: PaymentType.SUPPLIER_PAYMENT,
          method: params.method,
          amount: totalPaymentAmount,
          status: PaymentStatus.SUCCESS,
          referenceNumber: params.referenceNumber || null,
          date: params.date || new Date(),
          notes: params.notes || `Disbursement to ${supplier.name}`,
          recordedById: params.userId,
          createdBy: params.userId,
        },
      });

      // 2. Allocate payment across Purchase invoices
      let remainingToApply = totalPaymentAmount;
      const linksCreated = [];

      if (params.invoices && params.invoices.length > 0) {
        // Specific allocations designated by user
        for (const item of params.invoices) {
          const appliedDecimal = new Prisma.Decimal(item.amount.toString());
          const purchase = await tx.purchase.findFirst({
            where: { id: item.purchaseId, tenantId: this.tenantId, supplierId: supplier.id },
          });

          if (!purchase) {
            throw new Error(`Purchase invoice ${item.purchaseId} not found for this supplier`);
          }

          const newPaidAmount = purchase.paidAmount.plus(appliedDecimal);

          await tx.purchase.update({
            where: { id: purchase.id },
            data: {
              paidAmount: newPaidAmount,
              updatedBy: params.userId,
            },
          });

          const link = await tx.supplierPaymentLink.create({
            data: {
              tenantId: this.tenantId,
              paymentId: payment.id,
              purchaseId: purchase.id,
              amountApplied: appliedDecimal,
            },
          });
          linksCreated.push(link);
        }
      } else {
        // FIFO Allocation across unpaid purchases
        const unpaidPurchases = await tx.purchase.findMany({
          where: {
            supplierId: supplier.id,
            tenantId: this.tenantId,
            isDeleted: false,
          },
          orderBy: { purchaseDate: "asc" },
        });

        for (const purchase of unpaidPurchases) {
          if (remainingToApply.lte(0)) break;

          const unpaidBalance = purchase.totalAmount.minus(purchase.paidAmount);
          if (unpaidBalance.gt(0)) {
            const applyAmount = remainingToApply.gte(unpaidBalance) ? unpaidBalance : remainingToApply;

            await tx.purchase.update({
              where: { id: purchase.id },
              data: {
                paidAmount: purchase.paidAmount.plus(applyAmount),
                updatedBy: params.userId,
              },
            });

            const link = await tx.supplierPaymentLink.create({
              data: {
                tenantId: this.tenantId,
                paymentId: payment.id,
                purchaseId: purchase.id,
                amountApplied: applyAmount,
              },
            });
            linksCreated.push(link);

            remainingToApply = remainingToApply.minus(applyAmount);
          }
        }
      }

      // 3. Decrement Supplier's currentBalance (Payables reduced)
      const newSupplierBalance = supplier.currentBalance.minus(totalPaymentAmount);
      const updatedSupplier = await tx.supplier.update({
        where: { id: supplier.id },
        data: {
          currentBalance: newSupplierBalance,
          updatedBy: params.userId,
        },
      });

      // 4. Double-Entry General Ledger Entries
      // Debit: Accounts Payable (Liability decreases)
      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: AccountType.ACCOUNTS_PAYABLE,
          entityType: "SUPPLIER",
          entityId: supplier.id,
          debit: totalPaymentAmount,
          credit: new Prisma.Decimal(0),
          balanceAfter: newSupplierBalance,
          referenceType: "SUPPLIER_PAYMENT",
          referenceId: payment.id,
          paymentId: payment.id,
          supplierId: supplier.id,
          description: `Supplier payment applied to ${supplier.name} (${params.method})`,
          date: payment.date,
          createdBy: params.userId,
        },
      });

      // Credit: Cash / Bank (Asset decreases)
      const creditAccount =
        params.method === PaymentMethod.BANK_TRANSFER || params.method === PaymentMethod.CHEQUE
          ? AccountType.BANK
          : AccountType.CASH_DRAWER;

      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: creditAccount,
          entityType: "SUPPLIER",
          entityId: supplier.id,
          debit: new Prisma.Decimal(0),
          credit: totalPaymentAmount,
          balanceAfter: new Prisma.Decimal(0).minus(totalPaymentAmount),
          referenceType: "SUPPLIER_PAYMENT",
          referenceId: payment.id,
          paymentId: payment.id,
          supplierId: supplier.id,
          description: `Disbursement to supplier ${supplier.name} [Ref: ${params.referenceNumber || "N/A"}]`,
          date: payment.date,
          createdBy: params.userId,
        },
      });

      return {
        payment,
        supplier: updatedSupplier,
        links: linksCreated,
      };
    });
  }

  // ============================================================================
  // ACCOUNTS RECEIVABLE (Customer Credit Invoices & Receipts)
  // ============================================================================

  async findCustomersWithReceivables() {
    return this.db.customer.findMany({
      where: {
        isDeleted: false,
      },
      include: {
        sales: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
            receiptNumber: true,
            saleDate: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
          },
          orderBy: { saleDate: "asc" },
        },
      },
      orderBy: { currentBalance: "desc" },
    });
  }

  async findUnpaidSalesByCustomer(customerId: string) {
    return this.db.sale.findMany({
      where: {
        customerId,
        isDeleted: false,
      },
      orderBy: { saleDate: "asc" },
    });
  }

  async recordCustomerPayment(params: {
    customerId: string;
    amount: number;
    method: PaymentMethod;
    referenceNumber?: string | null;
    date?: Date;
    notes?: string | null;
    invoices?: Array<{ saleId: string; amount: number }>;
    userId?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: params.customerId, tenantId: this.tenantId, isDeleted: false },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      const totalReceiptAmount = new Prisma.Decimal(params.amount.toString());

      // 1. Create Immutable Payment Record
      const payment = await tx.payment.create({
        data: {
          tenantId: this.tenantId,
          type: PaymentType.CUSTOMER_RECEIPT,
          method: params.method,
          amount: totalReceiptAmount,
          status: PaymentStatus.SUCCESS,
          referenceNumber: params.referenceNumber || null,
          date: params.date || new Date(),
          notes: params.notes || `Credit payment from ${customer.name}`,
          recordedById: params.userId,
          createdBy: params.userId,
        },
      });

      // 2. Allocate payment across Credit Sales
      let remainingToApply = totalReceiptAmount;
      const linksCreated = [];

      if (params.invoices && params.invoices.length > 0) {
        for (const item of params.invoices) {
          const appliedDecimal = new Prisma.Decimal(item.amount.toString());
          const sale = await tx.sale.findFirst({
            where: { id: item.saleId, tenantId: this.tenantId, customerId: customer.id },
          });

          if (!sale) {
            throw new Error(`Sale invoice ${item.saleId} not found for this customer`);
          }

          const newPaidAmount = sale.paidAmount.plus(appliedDecimal);

          await tx.sale.update({
            where: { id: sale.id },
            data: {
              paidAmount: newPaidAmount,
              updatedBy: params.userId,
            },
          });

          const link = await tx.customerPaymentLink.create({
            data: {
              tenantId: this.tenantId,
              paymentId: payment.id,
              saleId: sale.id,
              amountApplied: appliedDecimal,
            },
          });
          linksCreated.push(link);
        }
      } else {
        // FIFO Allocation across unpaid sales
        const unpaidSales = await tx.sale.findMany({
          where: {
            customerId: customer.id,
            tenantId: this.tenantId,
            isDeleted: false,
          },
          orderBy: { saleDate: "asc" },
        });

        for (const sale of unpaidSales) {
          if (remainingToApply.lte(0)) break;

          const unpaidBalance = sale.totalAmount.minus(sale.paidAmount);
          if (unpaidBalance.gt(0)) {
            const applyAmount = remainingToApply.gte(unpaidBalance) ? unpaidBalance : remainingToApply;

            await tx.sale.update({
              where: { id: sale.id },
              data: {
                paidAmount: sale.paidAmount.plus(applyAmount),
                updatedBy: params.userId,
              },
            });

            const link = await tx.customerPaymentLink.create({
              data: {
                tenantId: this.tenantId,
                paymentId: payment.id,
                saleId: sale.id,
                amountApplied: applyAmount,
              },
            });
            linksCreated.push(link);

            remainingToApply = remainingToApply.minus(applyAmount);
          }
        }
      }

      // 3. Decrement Customer's currentBalance (Receivables reduced)
      const newCustomerBalance = customer.currentBalance.minus(totalReceiptAmount);
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          currentBalance: newCustomerBalance,
          updatedBy: params.userId,
        },
      });

      // 4. Double-Entry General Ledger Entries
      // Debit: Cash / Bank (Asset increases)
      const debitAccount =
        params.method === PaymentMethod.BANK_TRANSFER || params.method === PaymentMethod.CHEQUE
          ? AccountType.BANK
          : AccountType.CASH_DRAWER;

      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: debitAccount,
          entityType: "CUSTOMER",
          entityId: customer.id,
          debit: totalReceiptAmount,
          credit: new Prisma.Decimal(0),
          balanceAfter: totalReceiptAmount,
          referenceType: "CUSTOMER_PAYMENT",
          referenceId: payment.id,
          paymentId: payment.id,
          customerId: customer.id,
          description: `Customer credit receipt from ${customer.name} (${params.method})`,
          date: payment.date,
          createdBy: params.userId,
        },
      });

      // Credit: Accounts Receivable (Asset decreases)
      await tx.accountLedger.create({
        data: {
          tenantId: this.tenantId,
          accountType: AccountType.ACCOUNTS_RECEIVABLE,
          entityType: "CUSTOMER",
          entityId: customer.id,
          debit: new Prisma.Decimal(0),
          credit: totalReceiptAmount,
          balanceAfter: newCustomerBalance,
          referenceType: "CUSTOMER_PAYMENT",
          referenceId: payment.id,
          paymentId: payment.id,
          customerId: customer.id,
          description: `Settlement of receivables for ${customer.name} [Ref: ${params.referenceNumber || "N/A"}]`,
          date: payment.date,
          createdBy: params.userId,
        },
      });

      return {
        payment,
        customer: updatedCustomer,
        links: linksCreated,
      };
    });
  }

  // ============================================================================
  // REVENUE & COGS DATA RETRIEVAL (Gross Profit Support)
  // ============================================================================

  async findSaleItemsForProfit(params: {
    startDate?: Date;
    endDate?: Date;
    branchId?: string;
  }) {
    const saleWhere: Prisma.SaleWhereInput = {
      tenantId: this.tenantId,
      isDeleted: false,
    };

    if (params.branchId) {
      saleWhere.branchId = params.branchId;
    }

    if (params.startDate || params.endDate) {
      saleWhere.saleDate = {};
      if (params.startDate) saleWhere.saleDate.gte = params.startDate;
      if (params.endDate) saleWhere.saleDate.lte = params.endDate;
    }

    return this.db.saleItem.findMany({
      where: {
        sale: saleWhere,
      },
      include: {
        sale: {
          select: {
            id: true,
            receiptNumber: true,
            saleDate: true,
            branchId: true,
          },
        },
        medicine: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            purchasePrice: true,
            sellingPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
