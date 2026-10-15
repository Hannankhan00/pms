"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Percent,
  CreditCard,
  Download,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/lib/currency/context";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { SalesTimelineChart } from "@/components/reports/sales-timeline-chart";
import { exportToCsv } from "@/lib/utils/export";

export default function SalesReportPage() {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const offset = new Date().getTimezoneOffset();
      const res = await fetch(
        `/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&timezoneOffset=${offset}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch sales analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesReport();
  }, [dateRange]);

  const handleExport = () => {
    if (!data?.timeline) return;
    exportToCsv("sales_timeline_report", data.timeline, [
      { key: "date", label: "Date" },
      { key: "revenue", label: "Revenue ($)", formatter: (v) => Number(v).toFixed(2) },
      { key: "salesCount", label: "Invoice Count" },
      { key: "averageBasket", label: "Average Basket ($)", formatter: (v) => Number(v).toFixed(2) },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title & Global Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.reports?.sales?.title ?? "Sales & Revenue Analytics"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.reports?.sales?.subtitle ?? "Comprehensive transaction volume, payment channel allocation, and daily billing trajectory."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <button
            onClick={fetchSalesReport}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>{t.common?.refresh ?? "Refresh"}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={!data || data.timeline?.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] focus:outline-none disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.reports?.export ?? "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.reports?.sales?.totalRevenue ?? "Total Revenue"}</span>
            <div className="rounded-lg bg-[#0F766E]/10 p-2 text-[#0F766E]">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {formatCurrency(data?.summary?.totalRevenue || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Subtotal: {formatCurrency(data?.summary?.totalSubtotal || 0)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.reports?.sales?.invoices ?? "Invoices Completed"}</span>
            <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {data?.summary?.salesCount || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Settled POS transactions</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.reports?.sales?.avgBasket ?? "Average Basket"}</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {formatCurrency(data?.summary?.averageBasket || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Revenue per invoice</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.reports?.sales?.totalDiscount ?? "Total Discounts"}</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {formatCurrency(data?.summary?.totalDiscount || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Customer promotional savings</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t.reports?.sales?.totalTax ?? "Tax Collected"}</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {formatCurrency(data?.summary?.totalTax || 0)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Government clinical VAT / GST</div>
        </div>
      </div>

      {/* Main Content Grid: Chart & Payment Channel Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t.reports?.sales?.dailyTrend ?? "Daily Revenue Trajectory"}
              </h2>
              <p className="text-xs text-slate-500">
                {t.reports?.sales?.dailyTrendDesc ?? "Continuous billing run rate and ticket volume per calendar day."}
              </p>
            </div>
          </div>

          <SalesTimelineChart data={data?.timeline || []} height={320} />
        </div>

        {/* Payment Methods Breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t.reports?.sales?.paymentChannels ?? "Payment Methods"}
              </h2>
              <p className="text-xs text-slate-500">Distribution across settlement rails</p>
            </div>
            <CreditCard className="h-4 w-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            {data?.byPaymentMethod?.map((channel: any) => (
              <div key={channel.method} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">{channel.method}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-slate-900">
                      {formatCurrency(channel.totalAmount)}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      ({channel.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#0F766E] transition-all duration-500"
                    style={{ width: `${Math.min(100, channel.percentage)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400">{channel.count} transactions processed</div>
              </div>
            ))}

            {(!data?.byPaymentMethod || data.byPaymentMethod.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400">
                No payment breakdown available for selected range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
