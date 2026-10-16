"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertOctagon,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  PhoneCall,
  Pill,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n/context";

export default function SuspendedPage() {
  const { t, isRtl } = useI18n();
  const [isChecking, setIsChecking] = useState(false);

  const billingUrl =
    process.env.NEXT_PUBLIC_HUB_BILLING_URL || "https://api.example.com/billing";

  const handleRefreshStatus = () => {
    setIsChecking(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 600);
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] p-4 font-sans">
      {/* Top right language selector */}
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#0F766E] text-white elevation-1">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">
            {t.brand.title}
          </h1>
          <p className="text-xs font-medium text-[#475569]">
            {t.brand.subtitle}
          </p>
        </div>

        {/* Suspension Notification Card */}
        <Card className="border-[#E2E8F0] bg-white elevation-2">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-[#0F172A]">
                  {t.suspended.title}
                </CardTitle>
              </div>
              <Badge variant="danger" className="font-mono text-[10px]">
                {t.suspended.badge}
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#475569]">
              {t.suspended.subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Explanation banner */}
            <div className="rounded-[8px] border border-[#FEE2E2] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B]">
              <p className="leading-relaxed">{t.suspended.explanation}</p>
            </div>

            {/* Read-Only Safety Assurance */}
            <div className="flex items-start gap-2.5 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#475569]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#16A34A] mt-0.5" />
              <p className="leading-relaxed">{t.suspended.safeDataNotice}</p>
            </div>

            {/* Subscription Action Options */}
            <div className="space-y-2 pt-2">
              <Button asChild className="w-full gap-2 bg-[#0F766E] hover:bg-[#115E59]">
                <a href={billingUrl} target="_blank" rel="noopener noreferrer">
                  <CreditCard className="h-4 w-4" />
                  {t.suspended.openBillingPortal}
                  <ExternalLink className="h-3.5 w-3.5 rtl:rotate-180" />
                </a>
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2 border-[#CBD5E1] text-[#0F172A] hover:bg-slate-50"
                onClick={handleRefreshStatus}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
                {t.suspended.retryAccess}
              </Button>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-[#E2E8F0] pt-4 text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5 text-[11px]">
              <PhoneCall className="h-3.5 w-3.5 text-[#0F766E]" />
              <span>{t.suspended.contactSupport}</span>
            </div>
            <span className="font-mono text-[10px] text-[#94A3B8]">
              ERR_TENANT_SUSPENDED
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
