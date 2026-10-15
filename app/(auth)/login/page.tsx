"use client";

import React from "react";
import Link from "next/link";
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
import { Pill, ShieldCheck, ArrowRight, Info } from "lucide-react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useI18n } from "@/lib/i18n/context";

export default function LoginPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#F8FAFC] p-4">
      {/* Top right language switcher */}
      <div className="absolute top-4 right-4 rtl:right-auto rtl:left-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[#0F766E] text-white elevation-1">
            <Pill className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.auth.portalTitle}
          </h1>
          <p className="text-xs text-[#475569]">{t.auth.portalSubtitle}</p>
        </div>

        <Card className="border-[#E2E8F0] bg-white elevation-2">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-[#0F172A]">{t.auth.authTitle}</CardTitle>
              <Badge variant="warning" className="text-[10px]">
                {t.auth.mockHubBadge}
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#475569]">
              {t.auth.mockHubDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs text-[#0F172A]">
              <div className="flex items-center gap-2 font-semibold text-[#0F766E]">
                <Info className="h-4 w-4 text-[#0F766E]" />
                {t.auth.activeDevIdentity}
              </div>
              <div className="space-y-1 text-[#475569]">
                <div>
                  <span className="font-semibold text-[#0F172A]">{t.auth.tenant}:</span> Development Pharmacy (
                  <code className="font-mono text-[#0F766E]">tenant-dev-pharmacy-1</code>)
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A]">{t.auth.user}:</span> Development Admin (
                  <code className="font-mono text-[#0F766E]">admin@devpharmacy.local</code>)
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A]">{t.auth.mappedHubId}:</span>{" "}
                  <code className="font-mono text-[#0F766E]">dev-hub-user-1</code>
                </div>
                <div>
                  <span className="font-semibold text-[#0F172A]">{t.auth.role}:</span> Super Admin
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[#475569]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
              {t.auth.isolationNotice}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full gap-2">
              <Link href="/dashboard">
                {t.auth.enterDashboard}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </Button>
            <p className="text-center text-[11px] text-[#94A3B8]">
              {t.auth.noPasswordNotice}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
