"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileText,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Stethoscope,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export default function ReportsHubPage() {
  const { t } = useI18n();

  const reportModules = [
    {
      title: t.reports?.sales?.title ?? "Sales & Revenue Analytics",
      description: "Continuous sales trajectory, basket sizes, daily billing runs, and multi-channel payment method breakdown.",
      href: "/dashboard/reports/sales",
      icon: BarChart3,
      badge: "Real-Time POS",
      color: "text-[#0F766E] bg-teal-50 border-teal-200",
    },
    {
      title: t.reports?.inventory?.title ?? "Inventory Intelligence",
      description: "Capital tied up in stock, proactive FEFO expiry surveillance, velocity ranking, and dead stock liquidation audits.",
      href: "/dashboard/reports/inventory",
      icon: Boxes,
      badge: "Supply Chain",
      color: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      title: t.reports?.shifts?.title ?? "EOD Shift Reconciliation",
      description: "Cash drawer variance tracking, cashier accountability, audit trails of mid-shift drops and payouts.",
      href: "/dashboard/reports/shifts",
      icon: CircleDollarSign,
      badge: "Cashier Audit",
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      title: t.reports?.clinical?.title ?? "Clinical & Dispensing Analytics",
      description: "Pharmacist prescription verification rate, regulated Rx versus OTC split, and top prescribing doctor partnerships.",
      href: "/dashboard/reports/clinical",
      icon: FileText,
      badge: "Clinical Care",
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          {t.reports?.title ?? "Executive Reports & Analytics"}
        </h1>
        <p className="text-xs text-slate-500">
          Centralized business intelligence aggregating transactional POS, clinical dispensing, supply chain, and cashier audit data.
        </p>
      </div>

      {/* Module Navigation Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {reportModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-[#0F766E]/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl border p-3 ${mod.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                    {mod.badge}
                  </span>
                </div>

                <h2 className="mt-4 text-base font-bold text-slate-900 group-hover:text-[#0F766E]">
                  {mod.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{mod.description}</p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] group-hover:underline">
                <span>View Comprehensive Report</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
