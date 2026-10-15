"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  AlertTriangle,
  Clock,
  TrendingUp,
  PackageX,
  Download,
  RefreshCw,
  Search,
  DollarSign,
  Layers,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/lib/currency/context";
import { exportToCsv } from "@/lib/utils/export";

type TabType = "valuation" | "expiry" | "movement";

export default function InventoryReportsPage() {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState<TabType>("valuation");
  const [loading, setLoading] = useState(false);

  // Data states
  const [valuationData, setValuationData] = useState<any>(null);
  const [expiryData, setExpiryData] = useState<any>(null);
  const [movementData, setMovementData] = useState<any>(null);

  // Filters
  const [expiryDays, setExpiryDays] = useState(90);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchValuation = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/inventory/valuation");
      const json = await res.json();
      if (json.success) setValuationData(json.data);
    } catch (err) {
      console.error("Valuation fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/inventory/expiry?days=${expiryDays}`);
      const json = await res.json();
      if (json.success) setExpiryData(json.data);
    } catch (err) {
      console.error("Expiry fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovement = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/inventory/movement?fastMovingDays=30&deadStockDays=90&limit=15");
      const json = await res.json();
      if (json.success) setMovementData(json.data);
    } catch (err) {
      console.error("Movement fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "valuation") fetchValuation();
    if (activeTab === "expiry") fetchExpiry();
    if (activeTab === "movement") fetchMovement();
  }, [activeTab, expiryDays]);

  const handleExport = () => {
    if (activeTab === "valuation" && valuationData?.topValuedBatches) {
      exportToCsv("inventory_valuation_batches", valuationData.topValuedBatches, [
        { key: "batchNumber", label: "Batch Number" },
        { key: "medicineName", label: "Medicine Name" },
        { key: "sku", label: "SKU" },
        { key: "categoryName", label: "Category" },
        { key: "currentStock", label: "Units in Stock" },
        { key: "purchasePrice", label: "Cost Price ($)", formatter: (v) => Number(v).toFixed(2) },
        { key: "valuation", label: "Capital Valuation ($)", formatter: (v) => Number(v).toFixed(2) },
        { key: "expiryDate", label: "Expiry Date", formatter: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
      ]);
    } else if (activeTab === "expiry" && expiryData) {
      const allBatches = [
        ...(expiryData.expired || []).map((b: any) => ({ ...b, status: "EXPIRED" })),
        ...(expiryData.expiringSoon || []).map((b: any) => ({ ...b, status: "EXPIRING_SOON" })),
      ];
      exportToCsv("inventory_expiry_surveillance", allBatches, [
        { key: "status", label: "Status" },
        { key: "batchNumber", label: "Batch Number" },
        { key: "medicineName", label: "Medicine Name" },
        { key: "sku", label: "SKU" },
        { key: "categoryName", label: "Category" },
        { key: "currentStock", label: "Remaining Units" },
        { key: "atRiskCapital", label: "Capital at Risk ($)", formatter: (v) => Number(v).toFixed(2) },
        { key: "daysRemaining", label: "Days Remaining" },
        { key: "expiryDate", label: "Expiry Date", formatter: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
      ]);
    } else if (activeTab === "movement" && movementData) {
      exportToCsv("dead_stock_report", movementData.deadStock || [], [
        { key: "medicineName", label: "Medicine Name" },
        { key: "sku", label: "SKU" },
        { key: "categoryName", label: "Category" },
        { key: "currentStock", label: "Stagnant Units" },
        { key: "deadStockValue", label: "Trapped Capital ($)", formatter: (v) => Number(v).toFixed(2) },
        { key: "lastBatchDate", label: "Last Inward Date", formatter: (v) => v ? new Date(v).toISOString().split("T")[0] : "" },
      ]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.reports?.inventory?.title ?? "Inventory Intelligence & Health"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.reports?.inventory?.subtitle ?? "Capital valuation, proactive expiry surveillance, velocity analysis, and dead stock identification."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === "valuation") fetchValuation();
              if (activeTab === "expiry") fetchExpiry();
              if (activeTab === "movement") fetchMovement();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>{t.common?.refresh ?? "Refresh"}</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] focus:outline-none"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.reports?.export ?? "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("valuation")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "valuation"
              ? "border-[#0F766E] text-[#0F766E]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>{t.reports?.inventory?.valuationTab ?? "Capital Valuation"}</span>
        </button>

        <button
          onClick={() => setActiveTab("expiry")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "expiry"
              ? "border-[#0F766E] text-[#0F766E]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>{t.reports?.inventory?.expiryTab ?? "Expiry Surveillance"}</span>
          {expiryData?.summary?.expiredCount > 0 && (
            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
              {expiryData.summary.expiredCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("movement")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "movement"
              ? "border-[#0F766E] text-[#0F766E]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>{t.reports?.inventory?.movementTab ?? "Movement & Dead Stock"}</span>
        </button>
      </div>

      {/* TAB 1: VALUATION */}
      {activeTab === "valuation" && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Total Capital Valuation (Cost)</span>
              <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
                {formatCurrency(valuationData?.summary?.totalValuation || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Total purchasing capital tied up</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Retail Potential (Selling Value)</span>
              <div className="mt-2 font-mono text-xl font-bold tracking-tight text-[#0F766E]">
                {formatCurrency(valuationData?.summary?.totalRetailValue || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Expected sales realization</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Potential Gross Margin</span>
              <div className="mt-2 font-mono text-xl font-bold tracking-tight text-indigo-700">
                {formatCurrency(valuationData?.summary?.potentialGrossProfit || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">Projected inventory margin</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-medium text-slate-500">Stock In Hand</span>
              <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
                {valuationData?.summary?.totalUnitsInStock || 0}{" "}
                <span className="text-xs font-normal text-slate-400">units</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Across {valuationData?.summary?.totalActiveBatches || 0} active batches
              </div>
            </div>
          </div>

          {/* Category Allocation */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Category Capital Allocation</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {valuationData?.categoryBreakdown?.map((cat: any) => (
                <div key={cat.name} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-semibold text-slate-800">{cat.name}</span>
                    <span className="font-mono text-xs text-slate-500">{cat.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 font-mono text-sm font-bold text-slate-900">
                    {formatCurrency(cat.valuation)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {cat.units} units ({cat.batchCount} batches)
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Valued Batches Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Top 10 Capital-Tied Batches</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-3 font-semibold">Batch No</th>
                    <th className="p-3 font-semibold">Medicine</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 text-right font-semibold">Stock</th>
                    <th className="p-3 text-right font-semibold">Cost Price</th>
                    <th className="p-3 text-right font-semibold">Capital Tied</th>
                    <th className="p-3 font-semibold">Expiry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {valuationData?.topValuedBatches?.map((b: any) => (
                    <tr key={b.batchId} className="hover:bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-800">{b.batchNumber}</td>
                      <td className="p-3 font-sans font-medium text-slate-900">
                        {b.medicineName} <span className="text-[11px] text-slate-400">({b.sku})</span>
                      </td>
                      <td className="p-3 font-sans text-slate-600">{b.categoryName}</td>
                      <td className="p-3 text-right text-slate-800">{b.currentStock}</td>
                      <td className="p-3 text-right text-slate-600">{formatCurrency(b.purchasePrice)}</td>
                      <td className="p-3 text-right font-bold text-[#0F766E]">{formatCurrency(b.valuation)}</td>
                      <td className="p-3 text-slate-500">
                        {b.expiryDate ? new Date(b.expiryDate).toISOString().split("T")[0] : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXPIRY SURVEILLANCE */}
      {activeTab === "expiry" && (
        <div className="space-y-6">
          {/* Expiry Header & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Surveillance Horizon:</span>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setExpiryDays(d)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      expiryDays === d
                        ? "bg-[#0F766E] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="font-mono text-xs text-slate-500">
              Total Capital at Risk:{" "}
              <span className="font-bold text-red-600">
                {formatCurrency(expiryData?.summary?.totalAtRiskCapital || 0)}
              </span>
            </div>
          </div>

          {/* Expiry Summary KPI Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-red-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Already Expired</span>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-red-700">
                {expiryData?.summary?.expiredCount || 0}{" "}
                <span className="text-xs font-normal">batches</span>
              </div>
              <div className="mt-1 font-mono text-xs text-red-600">
                {formatCurrency(expiryData?.summary?.expiredCapital || 0)} trapped capital ({expiryData?.summary?.expiredUnits || 0} units)
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-semibold uppercase tracking-wider">Expiring within {expiryDays} Days</span>
                <Clock className="h-4 w-4" />
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-amber-700">
                {expiryData?.summary?.expiringSoonCount || 0}{" "}
                <span className="text-xs font-normal">batches</span>
              </div>
              <div className="mt-1 font-mono text-xs text-amber-600">
                {formatCurrency(expiryData?.summary?.expiringSoonCapital || 0)} at risk ({expiryData?.summary?.expiringSoonUnits || 0} units)
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Surveillance Status</span>
              <div className="mt-2 text-sm font-semibold text-slate-800">Proactive FEFO Priority Required</div>
              <div className="mt-1 text-xs text-slate-500">
                Prioritize dispensing near-expiry stock or arrange return to supplier before write-off.
              </div>
            </div>
          </div>

          {/* Expired Batches Table */}
          {expiryData?.expired?.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-red-700">Expired Stock (Immediate Quarantine & Disposal Required)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-red-100 bg-red-50/40 text-red-800">
                      <th className="p-2.5 font-semibold">Batch No</th>
                      <th className="p-2.5 font-semibold">Medicine</th>
                      <th className="p-2.5 font-semibold">Category</th>
                      <th className="p-2.5 text-right font-semibold">Remaining Units</th>
                      <th className="p-2.5 text-right font-semibold">Cost Loss</th>
                      <th className="p-2.5 font-semibold">Expiry Date</th>
                      <th className="p-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 font-mono">
                    {expiryData.expired.map((b: any) => (
                      <tr key={b.batchId} className="hover:bg-red-50/20">
                        <td className="p-2.5 font-semibold text-slate-800">{b.batchNumber}</td>
                        <td className="p-2.5 font-sans font-medium text-slate-900">{b.medicineName}</td>
                        <td className="p-2.5 font-sans text-slate-600">{b.categoryName}</td>
                        <td className="p-2.5 text-right text-red-700">{b.currentStock}</td>
                        <td className="p-2.5 text-right font-bold text-red-700">{formatCurrency(b.atRiskCapital)}</td>
                        <td className="p-2.5 text-slate-600">{new Date(b.expiryDate).toISOString().split("T")[0]}</td>
                        <td className="p-2.5">
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            EXPIRED ({Math.abs(b.daysRemaining)}d ago)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expiring Soon Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Batches Expiring Soon (FEFO Active Dispensing)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-2.5 font-semibold">Batch No</th>
                    <th className="p-2.5 font-semibold">Medicine</th>
                    <th className="p-2.5 font-semibold">Category</th>
                    <th className="p-2.5 text-right font-semibold">Stock</th>
                    <th className="p-2.5 text-right font-semibold">Capital at Risk</th>
                    <th className="p-2.5 font-semibold">Expiry Date</th>
                    <th className="p-2.5 font-semibold">Countdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {expiryData?.expiringSoon?.map((b: any) => (
                    <tr key={b.batchId} className="hover:bg-amber-50/20">
                      <td className="p-2.5 font-semibold text-slate-800">{b.batchNumber}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-900">{b.medicineName}</td>
                      <td className="p-2.5 font-sans text-slate-600">{b.categoryName}</td>
                      <td className="p-2.5 text-right text-slate-800">{b.currentStock}</td>
                      <td className="p-2.5 text-right font-semibold text-amber-700">{formatCurrency(b.atRiskCapital)}</td>
                      <td className="p-2.5 text-slate-600">{new Date(b.expiryDate).toISOString().split("T")[0]}</td>
                      <td className="p-2.5">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          {b.daysRemaining} days left
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!expiryData?.expiringSoon || expiryData.expiringSoon.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400">
                        No batches expiring within {expiryDays} days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MOVEMENT & DEAD STOCK */}
      {activeTab === "movement" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Fast Moving Items */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Fast-Moving Pharmaceuticals</h2>
                <p className="text-xs text-slate-500">Top volume sellers in the last 30 days</p>
              </div>
              <TrendingUp className="h-4 w-4 text-[#0F766E]" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-2.5 font-semibold">Medicine</th>
                    <th className="p-2.5 text-right font-semibold">Units Sold</th>
                    <th className="p-2.5 text-right font-semibold">Revenue</th>
                    <th className="p-2.5 text-right font-semibold">Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {movementData?.fastMoving?.map((m: any) => (
                    <tr key={m.medicineId} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-sans">
                        <div className="font-semibold text-slate-900">{m.medicineName}</div>
                        <div className="text-[11px] text-slate-400">{m.categoryName}</div>
                      </td>
                      <td className="p-2.5 text-right font-bold text-[#0F766E]">{m.totalQuantitySold}</td>
                      <td className="p-2.5 text-right text-slate-900">{formatCurrency(m.totalRevenue)}</td>
                      <td className="p-2.5 text-right text-slate-500">{m.transactionsCount}</td>
                    </tr>
                  ))}
                  {(!movementData?.fastMoving || movementData.fastMoving.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No sales movement recorded in the last 30 days.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dead Stock Items */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Dead Stock (Zero Sales in 90 Days)</h2>
                <p className="text-xs text-slate-500">
                  Total capital trapped:{" "}
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(movementData?.summary?.totalDeadStockCapital || 0)}
                  </span>
                </p>
              </div>
              <PackageX className="h-4 w-4 text-slate-400" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-2.5 font-semibold">Medicine</th>
                    <th className="p-2.5 text-right font-semibold">Stagnant Stock</th>
                    <th className="p-2.5 text-right font-semibold">Capital Trapped</th>
                    <th className="p-2.5 font-semibold">Last Inward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {movementData?.deadStock?.map((m: any) => (
                    <tr key={m.medicineId} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-sans">
                        <div className="font-semibold text-slate-900">{m.medicineName}</div>
                        <div className="text-[11px] text-slate-400">{m.categoryName}</div>
                      </td>
                      <td className="p-2.5 text-right text-slate-800">{m.currentStock}</td>
                      <td className="p-2.5 text-right font-bold text-red-600">{formatCurrency(m.deadStockValue)}</td>
                      <td className="p-2.5 text-slate-500">
                        {m.lastBatchDate ? new Date(m.lastBatchDate).toISOString().split("T")[0] : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {(!movementData?.deadStock || movementData.deadStock.length === 0) && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        Zero dead stock detected. Inventory turnover is optimal.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
