"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Boxes,
  Truck,
  ShoppingCart,
  FileText,
  HeartPulse,
  CircleDollarSign,
  UserCheck,
  ShieldAlert,
  Bell,
  BarChart3,
  Settings,
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  Pill,
  Stethoscope,
  Database,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isPlaceholder?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { t, isRtl } = useI18n();

  const NAV_ITEMS: NavItem[] = [
    { label: t.navigation.dashboard, href: "/dashboard", icon: LayoutDashboard },
    { label: t.navigation.branches, href: "/dashboard/branches", icon: Building2 },
    { label: t.navigation.products, href: "/dashboard/catalog", icon: Package },
    { label: t.navigation.inventory, href: "/dashboard/inventory", icon: Boxes },
    { label: t.navigation.procurement, href: "/dashboard/procurement", icon: Truck },
    { label: t.navigation.pos, href: "/dashboard/pos", icon: ShoppingCart },
    { label: t.navigation.prescriptions, href: "/dashboard/prescriptions", icon: FileText },
    { label: t.navigation.patients, href: "/dashboard/patients", icon: HeartPulse },
    { label: t.doctors?.title ?? "Doctors & Prescribers", href: "/dashboard/doctors", icon: Stethoscope },
    { label: t.expenses?.title ?? "Operating Expenses", href: "/dashboard/expenses", icon: Receipt },
    { label: t.payables?.title ?? "Accounts Payable", href: "/dashboard/payables", icon: CreditCard },
    { label: t.receivables?.title ?? "Accounts Receivable", href: "/dashboard/receivables", icon: Wallet },
    { label: t.finance?.title ?? "Financial Intelligence", href: "/dashboard/finance", icon: TrendingUp },
    { label: t.reports?.title ?? "Reports & Analytics", href: "/dashboard/reports", icon: BarChart3 },
    { label: t.navigation.users, href: "/dashboard/roles", icon: Users },
    { label: t.navigation.compliance, href: "/dashboard/compliance", icon: ShieldAlert },
    { label: t.navigation.notifications, href: "/dashboard/notifications", icon: Bell },
    { label: t.navigation.migration ?? "Data Migration", href: "/dashboard/migration", icon: Database },
    { label: t.navigation.settings ?? "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col bg-slate-900 text-slate-100",
        isRtl ? "border-l border-slate-800" : "border-r border-slate-800"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#0F766E] font-bold text-white">
          <Pill className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white">{t.brand.title}</span>
          <span className="text-xs font-medium text-[#80d5cb]">{t.brand.subtitle}</span>
        </div>
      </div>

      {/* Tenant Context Pill */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 px-4 py-3">
        <div className="mb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          {t.navigation.activeTenant}
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-200">
          <span className="truncate">Dev Pharmacy</span>
          <span className="rounded-full bg-[#0F766E]/20 px-2 py-0.5 font-mono text-[10px] text-[#9CF2E8]">
            dev-pharmacy-1
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center justify-between rounded-[8px] px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-[#0F766E] font-semibold text-white shadow-none"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                item.isPlaceholder &&
                  "cursor-not-allowed opacity-60 hover:bg-transparent hover:text-slate-400"
              )}
              onClick={(e) => {
                if (item.isPlaceholder) {
                  e.preventDefault();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{item.label}</span>
              </div>
              {item.isPlaceholder && (
                <span className="py-0.2 rounded border border-slate-700 bg-slate-800 px-1 text-[9px] text-slate-400">
                  {t.common.phase1Notice}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="border-t border-slate-800 p-4 text-[11px] text-slate-400">
        <div className="flex items-center justify-between">
          <span>{t.navigation.architecture}</span>
          <span className="font-medium text-teal-400">{t.navigation.phase0Foundation}</span>
        </div>
      </div>
    </aside>
  );
}

