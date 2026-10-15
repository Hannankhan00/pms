"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  RefreshCw,
  X,
  FileText,
  User,
  Building2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/lib/currency/context";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { exportToCsv } from "@/lib/utils/export";

export default function ShiftReportsPage() {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 14);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState<any>(null);

  const fetchShiftReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/shifts?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch shift reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftReport();
  }, [dateRange]);

  const handleExport = () => {
    if (!data?.shifts) return;
    exportToCsv("eod_shift_reconciliation", data.shifts, [
      { key: "shiftNumber", label: "Shift #" },
      { key: "cashier.name", label: "Cashier" },
      { key: "branch.name", label: "Branch" },
      { key: "startTime", label: "Start Time", formatter: (v) => v ? new Date(v).toLocaleString() : "" },
      { key: "endTime", label: "End Time", formatter: (v) => v ? new Date(v).toLocaleString() : "" },
      { key: "openingFloat", label: "Opening Float ($)", formatter: (v) => Number(v).toFixed(2) },
      { key: "expectedCash", label: "Expected Cash ($)", formatter: (v) => Number(v).toFixed(2) },
      { key: "closingCash", label: "Closing Cash ($)", formatter: (v) => Number(v).toFixed(2) },
      { key: "variance", label: "Variance ($)", formatter: (v) => Number(v).toFixed(2) },
      { key: "status", label: "Audit Status" },
      { key: "totalSalesVolume", label: "Total Sales ($)", formatter: (v) => Number(v).toFixed(2) },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.reports?.shifts?.title ?? "End of Day (EOD) Shift Reconciliation"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.reports?.shifts?.subtitle ?? "Cash drawer balance verification, cashier variance tracking, and audit trail of safe drops."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <button
            onClick={fetchShiftReport}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>{t.common?.refresh ?? "Refresh"}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={!data || data.shifts?.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] focus:outline-none disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.reports?.export ?? "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Shifts Audited</span>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {data?.summary?.totalShifts || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Closed terminal shifts</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Net Drawer Variance</span>
          <div
            className={`mt-2 font-mono text-xl font-bold tracking-tight ${
              (data?.summary?.totalVariance || 0) < 0
                ? "text-red-600"
                : (data?.summary?.totalVariance || 0) > 0
                ? "text-amber-600"
                : "text-[#16A34A]"
            }`}
          >
            {formatCurrency(data?.summary?.totalVariance || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Cumulative physical cash discrepancy</div>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Shortages</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-red-700">
            {data?.summary?.shortageCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-red-600">Shifts closing below expected cash</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Overages</span>
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-amber-700">
            {data?.summary?.overageCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-600">Shifts closing above expected cash</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Balanced</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold text-emerald-700">
            {data?.summary?.balancedCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600">Zero discrepancy balance</div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Cashier Shift Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="p-3 font-semibold">Shift #</th>
                <th className="p-3 font-semibold">Cashier</th>
                <th className="p-3 font-semibold">Branch</th>
                <th className="p-3 font-semibold">Duration</th>
                <th className="p-3 text-right font-semibold">Float</th>
                <th className="p-3 text-right font-semibold">Expected Cash</th>
                <th className="p-3 text-right font-semibold">Closing Cash</th>
                <th className="p-3 text-right font-semibold">Variance</th>
                <th className="p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data?.shifts?.map((shift: any) => {
                const isShortage = shift.variance < -0.01;
                const isOverage = shift.variance > 0.01;

                return (
                  <tr
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80"
                  >
                    <td className="p-3 font-semibold text-[#0F766E]">{shift.shiftNumber}</td>
                    <td className="p-3 font-sans font-medium text-slate-900">{shift.cashier.name}</td>
                    <td className="p-3 font-sans text-slate-600">{shift.branch.name}</td>
                    <td className="p-3 font-sans text-[11px] text-slate-500">
                      {new Date(shift.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {shift.endTime ? new Date(shift.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Open"}
                    </td>
                    <td className="p-3 text-right text-slate-600">{formatCurrency(shift.openingFloat)}</td>
                    <td className="p-3 text-right text-slate-800">{formatCurrency(shift.expectedCash)}</td>
                    <td className="p-3 text-right font-semibold text-slate-900">{formatCurrency(shift.closingCash)}</td>
                    <td
                      className={`p-3 text-right font-bold ${
                        isShortage ? "text-red-600" : isOverage ? "text-amber-600" : "text-[#16A34A]"
                      }`}
                    >
                      {shift.variance > 0 ? `+${formatCurrency(shift.variance)}` : formatCurrency(shift.variance)}
                    </td>
                    <td className="p-3 font-sans">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isShortage
                            ? "bg-red-100 text-red-700"
                            : isOverage
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!data?.shifts || data.shifts.length === 0) && (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 font-sans">
                    No closed shifts recorded for this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift Inspection Drawer */}
      {selectedShift && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Shift Audit: {selectedShift.shiftNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedShift.startTime).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedShift(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Cash Balance Breakdown */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Cash Reconciliation Balance
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Opening Float:</span>
                    <span>{formatCurrency(selectedShift.openingFloat)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-sans">Expected Cash:</span>
                    <span>{formatCurrency(selectedShift.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span className="font-sans">Physical Closing Cash:</span>
                    <span>{formatCurrency(selectedShift.closingCash)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                    <span className="font-sans">Reconciliation Variance:</span>
                    <span
                      className={
                        selectedShift.variance < -0.01
                          ? "text-red-600"
                          : selectedShift.variance > 0.01
                          ? "text-amber-600"
                          : "text-[#16A34A]"
                      }
                    >
                      {formatCurrency(selectedShift.variance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions (Safe Drops & Payouts) */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Mid-Shift Cash Movements ({selectedShift.transactions?.length || 0})
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  {selectedShift.transactions?.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3 shadow-xs"
                    >
                      <div>
                        <div className="font-sans font-semibold text-slate-800">{t.type}</div>
                        <div className="font-sans text-[11px] text-slate-400">{t.reason || "General transfer"}</div>
                      </div>
                      <div
                        className={`font-bold ${
                          t.type === "PAYOUT" ? "text-red-600" : "text-[#0F766E]"
                        }`}
                      >
                        {formatCurrency(t.amount)}
                      </div>
                    </div>
                  ))}
                  {(!selectedShift.transactions || selectedShift.transactions.length === 0) && (
                    <div className="py-4 text-center font-sans text-xs text-slate-400">
                      No mid-shift drops or payouts recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Sales in Shift */}
              <div>
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Shift Sales Invoices ({selectedShift.salesCount} total, {formatCurrency(selectedShift.totalSalesVolume)})
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  {selectedShift.recentSales?.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-2.5 shadow-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{s.receiptNumber}</span>
                        <span className="ml-2 font-sans text-[11px] text-slate-400">({s.method})</span>
                      </div>
                      <div className="font-bold text-slate-900">{formatCurrency(s.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-200 p-4">
              <button
                onClick={() => setSelectedShift(null)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
