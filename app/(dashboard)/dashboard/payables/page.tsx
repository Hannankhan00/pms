"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  CreditCard,
  Search,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  FileText,
  Calendar,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
}

interface PayableSupplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  currentBalance: number;
  unpaidInvoicesCount: number;
  totalUnpaidCalculated: number;
  purchases: PurchaseInvoice[];
}

export default function PayablesPage() {
  const { t, isRtl } = useI18n();

  const [suppliers, setSuppliers] = useState<PayableSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<PayableSupplier | null>(null);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "BANK_TRANSFER",
    referenceNumber: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [selectedInvoices, setSelectedInvoices] = useState<{ [purchaseId: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/payables");
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load payables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const openPaymentModal = (supplier: PayableSupplier) => {
    setSelectedSupplier(supplier);
    setPaymentForm({
      amount: supplier.currentBalance > 0 ? supplier.currentBalance.toString() : "",
      method: "BANK_TRANSFER",
      referenceNumber: "",
      date: new Date().toISOString().slice(0, 10),
      notes: `Settlement for ${supplier.name}`,
    });
    setSelectedInvoices({});
    setShowPayModal(true);
  };

  const handleInvoiceAmountChange = (purchaseId: string, val: string) => {
    setSelectedInvoices((prev) => ({
      ...prev,
      [purchaseId]: val,
    }));
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentForm.amount) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const invoicesPayload = Object.entries(selectedInvoices)
        .filter(([_, amt]) => parseFloat(amt) > 0)
        .map(([purchaseId, amt]) => ({
          purchaseId,
          amount: parseFloat(amt),
        }));

      const res = await fetch("/api/finance/payables/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          referenceNumber: paymentForm.referenceNumber || undefined,
          date: paymentForm.date,
          notes: paymentForm.notes || undefined,
          invoices: invoicesPayload.length > 0 ? invoicesPayload : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disburse payment");

      setStatusMessage({
        type: "success",
        text: `Successfully disbursed $${parseFloat(paymentForm.amount).toFixed(2)} to ${selectedSupplier.name}.`,
      });

      setShowPayModal(false);
      setSelectedSupplier(null);
      fetchPayables();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.contactPerson || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const totalOutstanding = suppliers.reduce((acc, s) => acc + s.currentBalance, 0);
  const totalPendingInvoices = suppliers.reduce((acc, s) => acc + s.unpaidInvoicesCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.payables?.title ?? "Accounts Payable"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.payables?.subtitle ?? "Manage supplier liabilities, invoice settlements, and vendor accounts"}
          </p>
        </div>

        <button
          onClick={fetchPayables}
          className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Payables</span>
        </button>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Total Outstanding Payables
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-rose-700">
              ${totalOutstanding.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">due</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Suppliers with Due</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {suppliers.filter((s) => s.currentBalance > 0).length}
            </span>
            <span className="text-xs text-slate-400">vendors</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
            Pending Purchase Invoices
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-amber-700">
              {totalPendingInvoices}
            </span>
            <span className="text-xs text-slate-400">orders</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between rounded-[12px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, contact, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[8px] border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F766E] focus:bg-white focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Showing {filteredSuppliers.length} supplier accounts
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone / Email</th>
                <th className="px-4 py-3 text-center">Unpaid Invoices</th>
                <th className="px-4 py-3 text-right">Outstanding Balance</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading suppliers liability data...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No suppliers with payables found.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.contactPerson || "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                      <div>{s.phone || "No phone"}</div>
                      <div className="text-[10px] text-slate-400">{s.email || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedSupplier(s)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200 hover:bg-amber-100 transition"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{s.unpaidInvoicesCount} invoices</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={s.currentBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                        ${s.currentBalance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openPaymentModal(s)}
                        className="inline-flex items-center gap-1 rounded-[8px] bg-[#0F766E] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#115E59] transition"
                      >
                        <CreditCard className="h-3 w-3" />
                        <span>Disburse</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices Inspection Drawer */}
      {selectedSupplier && !showPayModal && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30 backdrop-blur-xs">
          <div className="h-full w-full max-w-lg bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">{selectedSupplier.name}</h3>
                <p className="text-xs text-slate-500">Purchase Orders & Invoices History</p>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-[10px] bg-slate-50 p-4 font-mono text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Total Balance Due:</span>
                <span className="font-bold text-rose-700">${selectedSupplier.currentBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Unpaid Orders:</span>
                <span>{selectedSupplier.unpaidInvoicesCount}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Invoices Breakdown
              </h4>

              {selectedSupplier.purchases.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No invoices on file.</div>
              ) : (
                selectedSupplier.purchases.map((inv) => {
                  const unpaid = Number(inv.totalAmount) - Number(inv.paidAmount);
                  return (
                    <div
                      key={inv.id}
                      className="rounded-[10px] border border-slate-200 p-3.5 text-xs transition hover:border-[#0F766E]/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">#{inv.invoiceNumber}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {inv.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-600">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Total</span>
                          <span>${Number(inv.totalAmount).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Paid</span>
                          <span className="text-emerald-700">${Number(inv.paidAmount).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Remaining</span>
                          <span className="font-bold text-rose-700">${unpaid.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => openPaymentModal(selectedSupplier)}
                className="w-full flex items-center justify-center gap-1.5 rounded-[8px] bg-[#0F766E] py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59]"
              >
                <CreditCard className="h-4 w-4" />
                <span>Disburse Payment to Supplier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disburse Payment Workflow Modal */}
      {showPayModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Disburse Supplier Payment</h3>
                <p className="text-xs text-slate-500">Payee: {selectedSupplier.name}</p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleDisbursePayment} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">
                    Payment Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Payment Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  >
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="CASH">CASH (Physical Drawer)</option>
                    <option value="CARD">CARD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">
                    Ref # (Cheque / Trx No.)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHQ-99401"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Notes / Memo</label>
                <input
                  type="text"
                  placeholder="Optional audit memo"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Specific Invoices Optional Allocation */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">
                    Invoice Allocation (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400">Leave blank for automatic FIFO</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedSupplier.purchases
                    .filter((p) => Number(p.totalAmount) - Number(p.paidAmount) > 0.001)
                    .map((p) => {
                      const unpaid = Number(p.totalAmount) - Number(p.paidAmount);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-[8px] bg-slate-50 p-2 text-xs"
                        >
                          <div>
                            <span className="font-mono font-semibold text-slate-900">#{p.invoiceNumber}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-500">
                              (Due: ${unpaid.toFixed(2)})
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            max={unpaid}
                            placeholder="0.00"
                            value={selectedInvoices[p.id] || ""}
                            onChange={(e) => handleInvoiceAmountChange(p.id, e.target.value)}
                            className="w-24 rounded-[6px] border border-slate-200 bg-white px-2 py-1 font-mono text-right text-xs focus:border-[#0F766E] focus:outline-none"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="rounded-[8px] border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-[8px] bg-[#0F766E] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] disabled:opacity-50"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{submitting ? "Processing..." : "Authorize & Post Ledger"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
