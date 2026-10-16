"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building, ShieldCheck, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CurrencySwitcher } from "@/components/ui/currency-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useI18n } from "@/lib/i18n/context";

interface TopbarProps {
  tenantName?: string;
  branchName?: string;
  userName?: string;
  roleName?: string;
}

export function Topbar({
  tenantName = "Development Pharmacy",
  branchName = "Main Branch (MAIN-01)",
  userName = "Development Admin",
  roleName = "Super Admin",
}: TopbarProps) {
  const { t } = useI18n();

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[#E2E8F0] bg-white px-6">
      {/* Left: Active Branch & Tenant */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-[#0F172A]">
          <Building className="h-4 w-4 text-[#0F766E]" />
          <span className="font-semibold text-[#0F172A]">{tenantName}</span>
          <span className="text-[#94A3B8]">/</span>
          <span className="text-[#475569]">{branchName}</span>
        </div>
        <Badge variant="success" className="gap-1 text-[11px]">
          <ShieldCheck className="h-3 w-3" />
          {t.common.tenantIsolated}
        </Badge>
      </div>

      {/* Right: Language Switcher, Currency Switcher, Notification Bell, User identity & Mock Hub SSO Indicator */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <CurrencySwitcher />
        <NotificationBell />

        <div className="hidden items-center gap-2 rounded-full border border-[#CBD5E1] bg-[#F8FAFC] px-3 py-1 text-xs text-[#0F172A] sm:flex">
          <span className="font-medium text-[#475569]">{t.common.hubContext}:</span>
          <span className="font-mono text-[11px] text-[#0F172A]">dev-hub-user-1</span>
        </div>

        <div className="flex items-center gap-3 border-l border-[#E2E8F0] pl-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A]">
            <User className="h-4 w-4 text-[#475569]" />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-[#0F172A]">
              {userName}
            </span>
            <span className="text-[10px] font-medium text-[#0F766E]">
              {roleName}
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-1 text-xs text-[#475569] transition-colors hover:text-[#0F172A]"
          title="Switch Context / Auth Screen"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Auth</span>
        </Link>
      </div>
    </header>
  );
}
