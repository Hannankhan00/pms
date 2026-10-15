"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  Wallet,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  UserCheck,
  X,
  ShieldCheck,
} from "lucide-react";

interface CreditSale {
  id: string;
  receiptNumber: string;
  saleDate: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
}

interface ReceivableCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  creditLimit: number;
  currentBalance: number;
  unpaidSalesCount: number;
  totalUnpaidCalculated: number;
  sales: CreditSale[];
}

export default function ReceivablesPage() {
  const { t, isRtl } = useI18n();

  const [customers, setCustomers] = useState<ReceivableCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<ReceivableCustomer | null>(null);

  // Collection Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiptForm, setReceiptForm] = useState({
    amount: "",
    method: "CASH",
    referenceNumber: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [selectedSales, setSelectedSales] = useState<{ [saleId: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/receivables");
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load receivables", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const openReceiveModal = (customer: ReceivableCustomer) => {
    setSelectedCustomer(customer);
    setReceiptForm({
      amount: customer.currentBalance > 0 ? customer.currentBalance.toString() : "",
      method: "CASH",
      referenceNumber: "",
      date: new Date().toISOString().slice(0, 10),
      notes: `Credit settlement from ${customer.name}`,
    });
    setSelectedSales({});
    setShowReceiveModal(true);
  };

  const handleSaleAmountChange = (saleId: string, val: string) => {
    setSelectedSales((prev) => ({
      ...prev,
      [saleId]: val,
    }));
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !receiptForm.amount) return;

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const salesPayload = Object.entries(selectedSales)
        .filter(([_, amt]) => parseFloat(amt) > 0)
        .map(([saleId, amt]) => ({
          saleId,
          amount: parseFloat(amt),
        }));

      const res = await fetch("/api/finance/receivables/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: parseFloat(receiptForm.amount),
          method: receiptForm.method,
          referenceNumber: receiptForm.referenceNumber || undefined,
          date: receiptForm.date,
          notes: receiptForm.notes || undefined,
          invoices: salesPayload.length > 0 ? salesPayload : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to collect payment");

      setStatusMessage({
        type: "success",
        text: `Successfully collected $${parseFloat(receiptForm.amount).toFixed(2)} from ${selectedCustomer.name}.`,
      });

      setShowReceiveModal(false);
      setSelectedCustomer(null);
      fetchReceivables();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());

    return matchesSearch;
  });

  const totalOutstanding = customers.reduce((acc, c) => acc + c.currentBalance, 0);
  const totalPendingCreditSales = customers.reduce((acc, c) => acc + c.unpaidSalesCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.receivables?.title ?? "Accounts Receivable"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.receivables?.subtitle ?? "Track customer credit purchases, outstanding tabs, and collections"}
          </p>
        </div>

        <button
          onClick={fetchReceivables}
          className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Receivables</span>
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
            Total Outstanding Receivables
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-amber-700">
              ${totalOutstanding.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">due</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Credit Accounts</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {customers.filter((c) => c.currentBalance > 0).length}
            </span>
            <span className="text-xs text-slate-400">clients</span>
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">Unpaid Credit Sales</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {totalPendingCreditSales}
            </span>
            <span className="text-xs text-slate-400">receipts</span>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between rounded-[12px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[8px] border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F766E] focus:bg-white focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Showing {filteredCustomers.length} customer accounts
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Credit Limit</th>
                <th className="px-4 py-3 text-center">Unpaid Sales</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading customer receivables...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No customer receivables on file.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{c.phone || "N/A"}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">${c.creditLimit.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition"
                      >
                        <FileText className="h-3 w-3" />
                        <span>{c.unpaidSalesCount} sales</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={c.currentBalance > 0 ? "text-amber-700" : "text-emerald-700"}>
                        ${c.currentBalance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openReceiveModal(c)}
                        className="inline-flex items-center gap-1 rounded-[8px] bg-[#0F766E] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#115E59] transition"
                      >
                        <Wallet className="h-3 w-3" />
                        <span>Collect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credit Sales Inspection Drawer */}
      {selectedCustomer && !showReceiveModal && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/30 backdrop-blur-xs">
          <div className="h-full w-full max-w-lg bg-white p-6 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-500">Credit Sales Ledger History</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-[10px] bg-slate-50 p-4 font-mono text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Credit Limit:</span>
                <span>${selectedCustomer.creditLimit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Balance:</span>
                <span className="font-bold text-amber-700">${selectedCustomer.currentBalance.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Unpaid Credit Sales
              </h4>

              {selectedCustomer.sales.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No credit sales on file.</div>
              ) : (
                selectedCustomer.sales.map((sale) => {
                  const unpaid = Number(sale.totalAmount) - Number(sale.paidAmount);
                  return (
                    <div
                      key={sale.id}
                      className="rounded-[10px] border border-slate-200 p-3.5 text-xs transition hover:border-[#0F766E]/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900">Receipt #{sale.receiptNumber}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(sale.saleDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-600">
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Total</span>
                          <span>${Number(sale.totalAmount).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Paid</span>
                          <span className="text-emerald-700">${Number(sale.paidAmount).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-slate-400 uppercase">Balance</span>
                          <span className="font-bold text-amber-700">${unpaid.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => openReceiveModal(selectedCustomer)}
                className="w-full flex items-center justify-center gap-1.5 rounded-[8px] bg-[#0F766E] py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59]"
              >
                <Wallet className="h-4 w-4" />
                <span>Collect Customer Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Workflow Modal */}
      {showReceiveModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[16px] border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900">Collect Customer Payment</h3>
                <p className="text-xs text-slate-500">Client: {selectedCustomer.name}</p>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCollectPayment} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">
                    Receipt Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={receiptForm.amount}
                    onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Receipt Method</label>
                  <select
                    value={receiptForm.method}
                    onChange={(e) => setReceiptForm({ ...receiptForm, method: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  >
                    <option value="CASH">CASH (Drawer Deposit)</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Ref / Receipt #</label>
                  <input
                    type="text"
                    placeholder="e.g. REC-5520"
                    value={receiptForm.referenceNumber}
                    onChange={(e) => setReceiptForm({ ...receiptForm, referenceNumber: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.date}
                    onChange={(e) => setReceiptForm({ ...receiptForm, date: e.target.value })}
                    className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 uppercase">Notes / Audit Remarks</label>
                <input
                  type="text"
                  placeholder="Optional memo"
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  className="mt-1 w-full rounded-[8px] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0F766E] focus:bg-white focus:outline-none"
                />
              </div>

              {/* Specific Credit Sales Optional Allocation */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">
                    Credit Sales Allocation (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400">Leave blank for automatic FIFO</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedCustomer.sales
                    .filter((s) => Number(s.totalAmount) - Number(s.paidAmount) > 0.001)
                    .map((s) => {
                      const unpaid = Number(s.totalAmount) - Number(s.paidAmount);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-[8px] bg-slate-50 p-2 text-xs"
                        >
                          <div>
                            <span className="font-mono font-semibold text-slate-900">Receipt #{s.receiptNumber}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-500">
                              (Due: ${unpaid.toFixed(2)})
                            </span>
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            max={unpaid}
                            placeholder="0.00"
                            value={selectedSales[s.id] || ""}
                            onChange={(e) => handleSaleAmountChange(s.id, e.target.value)}
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
                  onClick={() => setShowReceiveModal(false)}
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
                  <span>{submitting ? "Processing..." : "Receive & Settle Ledger"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
