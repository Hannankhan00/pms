"use client";

import React, { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  Percent,
  Layers,
  BarChart2,
} from "lucide-react";

interface ProfitReport {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalSalesCount: number;
  totalItemsSold: number;
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
  itemBreakdown: Array<{
    medicineId: string;
    medicineName: string;
    sku: string;
    quantitySold: number;
    revenue: number;
    cogs: number;
    profit: number;
    marginPercentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
  }>;
}

export default function FinanceOverviewPage() {
  const { t, isRtl } = useI18n();

  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Date range filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/metrics/gross-profit?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (err) {
      console.error("Failed to load financial metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [startDate, endDate]);

  const setPresetRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.finance?.title ?? "Financial Intelligence"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.finance?.subtitle ?? "Real-time Gross Profit, Cost of Goods Sold, and Revenue Analytics"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[8px] border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              onClick={() => setPresetRange(7)}
              className="rounded-[6px] px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              7D
            </button>
            <button
              onClick={() => setPresetRange(30)}
              className="rounded-[6px] px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              30D
            </button>
            <button
              onClick={() => setPresetRange(90)}
              className="rounded-[6px] px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              90D
            </button>
          </div>

          <div className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="font-mono text-[11px] text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="font-mono text-[11px] text-slate-700 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchMetrics}
            title="Refresh"
            className="rounded-[8px] border border-slate-200 bg-white p-1.5 text-slate-600 shadow-xs hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              {t.finance?.grossProfit ?? "Gross Profit"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#0F766E]/10 text-[#0F766E]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-[#0F766E]">
              ${report?.grossProfit.toFixed(2) ?? "0.00"}
            </span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Revenue minus Batch COGS</div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              {t.finance?.totalRevenue ?? "Total Revenue"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              ${report?.totalRevenue.toFixed(2) ?? "0.00"}
            </span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">From {report?.totalSalesCount ?? 0} sales transactions</div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              {t.finance?.cogs ?? "Cost of Goods Sold"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-rose-50 text-rose-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              ${report?.totalCogs.toFixed(2) ?? "0.00"}
            </span>
            <span className="text-xs text-slate-400">USD</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Exact batch purchase price basis</div>
        </div>

        <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-wider text-slate-500 uppercase">
              {t.finance?.grossMargin ?? "Gross Margin"}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-sky-50 text-sky-600">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {report?.grossMarginPercentage.toFixed(1) ?? "0.0"}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Gross Profit / Total Revenue</div>
        </div>
      </div>

      {/* Daily Performance Breakdown */}
      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t.finance?.dailyPerformance ?? "Daily Revenue vs COGS Trend"}
            </h3>
            <p className="text-[11px] text-slate-500">Day-by-day profitability timeline</p>
          </div>
          <BarChart2 className="h-4 w-4 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">COGS</th>
                <th className="px-3 py-2 text-right">Gross Profit</th>
                <th className="px-3 py-2 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {!report || report.dailyBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center font-sans text-xs text-slate-400">
                    No sales recorded for this date range.
                  </td>
                </tr>
              ) : (
                report.dailyBreakdown.map((row) => {
                  const margin = row.revenue > 0 ? (row.grossProfit / row.revenue) * 100 : 0;
                  return (
                    <tr key={row.date} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-sans font-medium text-slate-700">{row.date}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-900">${row.revenue.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-rose-700">${row.cogs.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#0F766E]">
                        ${row.grossProfit.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Medication Gross Profit Contribution */}
      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t.finance?.itemContribution ?? "Medication Gross Profit Contribution"}
            </h3>
            <p className="text-[11px] text-slate-500">Itemized profitability ranking</p>
          </div>
          <Package className="h-4 w-4 text-slate-400" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-3 py-2">Medicine / SKU</th>
                <th className="px-3 py-2 text-center">Units Sold</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">COGS</th>
                <th className="px-3 py-2 text-right">Gross Profit</th>
                <th className="px-3 py-2 text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {!report || report.itemBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center font-sans text-xs text-slate-400">
                    No medication items sold in this period.
                  </td>
                </tr>
              ) : (
                report.itemBreakdown.map((item) => (
                  <tr key={item.medicineId} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2">
                      <div className="font-sans font-semibold text-slate-900">{item.medicineName}</div>
                      <div className="text-[10px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="px-3 py-2 text-center font-medium text-slate-700">{item.quantitySold}</td>
                    <td className="px-3 py-2 text-right text-slate-900">${item.revenue.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-rose-700">${item.cogs.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#0F766E]">${item.profit.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700">
                      {item.marginPercentage.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
