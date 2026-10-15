"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Tag,
  Building,
} from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
}

interface Expense {
  id: string;
  categoryId: string;
  branchId?: string | null;
  amount: number;
  date: string;
  description: string;
  receiptUrl?: string | null;
  paymentMethod: string;
  isReversed: boolean;
  reversalReason?: string | null;
  category: { id: string; name: string };
  branch?: { id: string; name: string; code: string } | null;
  recordedBy?: { id: string; name: string; email: string } | null;
}

export default function ExpensesPage() {
  const { t, isRtl } = useI18n();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Modal States
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [reversingExpense, setReversingExpense] = useState<Expense | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  // Form State
  const [form, setForm] = useState({
    categoryId: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    paymentMethod: "CASH",
    receiptUrl: "",
  });

  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        fetch("/api/finance/expenses"),
        fetch("/api/finance/expense-categories"),
      ]);

      const expData = await expRes.json();
      const catData = await catRes.json();

      if (expData.success) setExpenses(expData.data || []);
      if (catData.success) {
        setCategories(catData.data || []);
        if (catData.data?.length > 0 && !form.categoryId) {
          setForm((prev) => ({ ...prev, categoryId: catData.data[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load expenses data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.amount || !form.description) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          amount: parseFloat(form.amount),
          date: form.date,
          description: form.description,
          paymentMethod: form.paymentMethod,
          receiptUrl: form.receiptUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record expense");

      setStatusMessage({ type: "success", text: "Expense recorded and ledger debited successfully." });
      setForm({
        categoryId: categories[0]?.id || "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        description: "",
        paymentMethod: "CASH",
        receiptUrl: "",
      });
      setShowRecordModal(false);
      fetchData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName, description: categoryDesc || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      setCategoryName("");
      setCategoryDesc("");
      setShowCategoryModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReverseExpense = async () => {
    if (!reversingExpense || !reversalReason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/expenses/${reversingExpense.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reverse transaction");

      setReversingExpense(null);
      setReversalReason("");
      setStatusMessage({ type: "success", text: "Compensating reversal ledger transaction posted." });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.description.toLowerCase().includes(search.toLowerCase()) ||
      exp.category.name.toLowerCase().includes(search.toLowerCase()) ||
      (exp.recordedBy?.name || "").toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || exp.categoryId === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const totalExpenseAmount = filteredExpenses
    .filter((e) => !e.isReversed)
    .reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {/* Top Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.expenses?.title ?? "Operating Expenses"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.expenses?.subtitle ?? "Track operational branch overheads, utilities, and clinical costs"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <span>{t.expenses?.manageCategories ?? "Expense Categories"}</span>
          </button>

          <button
            onClick={() => setShowRecordModal(true)}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#115E59]"
          >
            <Plus className="h-4 w-4" />
            <span>{t.expenses?.recordExpense ?? "Record Expense"}</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 rounded-[8px] p-3 text-xs font-medium ${
            statusMessage.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Active Total Expenses</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              ${totalExpenseAmount.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Recorded Entries</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {filteredExpenses.length}
            </span>
            <span className="text-xs text-slate-400">transactions</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Active Categories</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {categories.length}
            </span>
            <span className="text-xs text-slate-400">categories</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search expenses by description, category, staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[8px] border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F766E] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#0F766E] focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            title="Refresh"
            className="rounded-[8px] border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Recorded By</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading expenses records...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No operating expenses recorded.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {exp.category?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      <div>{exp.description}</div>
                      {exp.receiptUrl && (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#0F766E] hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          <span>View Receipt</span>
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-500">{exp.recordedBy?.name || "System"}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      ${Number(exp.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.isReversed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                          <RotateCcw className="h-3 w-3" />
                          <span>Reversed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                          <span>Active</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!exp.isReversed && (
                        <button
                          onClick={() => setReversingExpense(exp)}
                          title="Reverse this transaction"
                          className="rounded-[6px] border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Receipt className="h-5 w-5 text-[#0F766E]" />
                <h3 className="font-bold">{t.expenses?.recordExpense ?? "Record Expense"}</h3>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="mt-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Category</label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                >
                  <option value="CASH">CASH (Physical Drawer)</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CARD">DEBIT / CREDIT CARD</option>
                  <option value="CHEQUE">CHEQUE</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Description / Purpose</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Utility bill payment, monthly pharmacy maintenance..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Receipt URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={form.receiptUrl}
                  onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[8px] bg-[#0F766E] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#115E59] disabled:opacity-50"
                >
                  {submitting ? "Posting..." : "Confirm & Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Tag className="h-5 w-5 text-[#0F766E]" />
                <h3 className="font-bold">Add Expense Category</h3>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity, Packaging, Store Rent"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief details about this overhead category"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-[8px] bg-[#0F766E] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#115E59]"
                >
                  {submitting ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center gap-2 text-rose-700">
              <RotateCcw className="h-5 w-5" />
              <h3 className="font-bold">Reverse Transaction (Financial Immutability)</h3>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Financial records cannot be deleted. Reversing will mark this expense as reversed and create an audit
              trail ledger entry to balance the general accounts.
            </p>

            <div className="mt-3 rounded-[8px] bg-slate-50 p-3 font-mono text-xs text-slate-700">
              <div>Amount: ${Number(reversingExpense.amount).toFixed(2)}</div>
              <div>Desc: {reversingExpense.description}</div>
            </div>

            <div className="mt-4">
              <label className="text-[11px] font-semibold text-slate-700 uppercase">Reason for Reversal *</label>
              <textarea
                required
                rows={2}
                placeholder="Explain why this entry is being reversed (e.g. Duplicate entry, wrong category)..."
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="mt-1 w-full rounded-[8px] border border-slate-200 p-2 text-xs text-slate-900 focus:border-rose-600 focus:outline-none"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReversingExpense(null)}
                className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !reversalReason.trim()}
                onClick={handleReverseExpense}
                className="rounded-[8px] bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? "Posting Reversal..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
