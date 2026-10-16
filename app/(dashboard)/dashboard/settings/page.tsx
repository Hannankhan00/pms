"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Building2,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Save,
  ShieldCheck,
  Coins,
  RefreshCw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface TenantData {
  id: string;
  hubTenantId: string | null;
  name: string;
  slug: string;
  subscriptionStatus: "ACTIVE" | "PAST_DUE" | "CANCELLED";
  receiptHeader: string | null;
  taxId: string | null;
  defaultCurrency: string;
  updatedAt?: string;
}

export default function PharmacySettingsPage() {
  const { t, isRtl } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tenant, setTenant] = useState<TenantData | null>(null);

  // Form states
  const [receiptHeader, setReceiptHeader] = useState("");
  const [taxId, setTaxId] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  const billingUrl =
    process.env.NEXT_PUBLIC_HUB_BILLING_URL || "https://api.example.com/billing";

  useEffect(() => {
    fetchTenantSettings();
  }, []);

  const fetchTenantSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/settings/tenant");
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(t.settings.unauthorizedNotice);
        }
        throw new Error("Failed to load pharmacy settings");
      }
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setTenant(d);
        setReceiptHeader(d.receiptHeader || "");
        setTaxId(d.taxId || "");
        setDefaultCurrency(d.defaultCurrency || "USD");
      }
    } catch (err: any) {
      setError(err?.message || "Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/settings/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptHeader: receiptHeader.trim() || null,
          taxId: taxId.trim() || null,
          defaultCurrency,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || t.settings.saveError);
      }

      setTenant((prev) => (prev ? { ...prev, ...json.data } : null));
      setSuccess(t.settings.savedSuccess);
    } catch (err: any) {
      setError(err?.message || t.settings.saveError);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="success" className="font-mono text-xs">
            {t.settings.statusActive}
          </Badge>
        );
      case "PAST_DUE":
        return (
          <Badge variant="warning" className="font-mono text-xs">
            {t.settings.statusPastDue}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="danger" className="font-mono text-xs">
            {t.settings.statusCancelled}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-mono text-xs">
            {status || "UNKNOWN"}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[#475569]">
          <RefreshCw className="h-4 w-4 animate-spin text-[#0F766E]" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#0F766E]" />
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.settings.title}
          </h1>
        </div>
        <p className="text-sm text-[#475569]">{t.settings.subtitle}</p>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-[8px] border border-[#FEE2E2] bg-[#FEF2F2] p-3 text-xs text-[#DC2626]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-[8px] border border-[#DCFCE7] bg-[#F0FDF4] p-3 text-xs text-[#16A34A]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SECTION 1: Read-Only SaaS Hub Subscription Information */}
      <Card className="border-[#E2E8F0] bg-white elevation-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#0F766E]" />
              <CardTitle className="text-base font-semibold text-[#0F172A]">
                {t.settings.subscriptionSectionTitle}
              </CardTitle>
            </div>
            {getStatusBadge(tenant?.subscriptionStatus)}
          </div>
          <CardDescription className="text-xs text-[#475569]">
            {t.settings.subscriptionSectionSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">
                {t.settings.hubTenantId}
              </span>
              <p className="mt-1 font-mono text-xs font-semibold text-[#0F172A]">
                {tenant?.hubTenantId || "Not Registered (Local Dev)"}
              </p>
            </div>

            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">
                Pharmacy Name & Slug
              </span>
              <p className="mt-1 text-xs font-semibold text-[#0F172A]">
                {tenant?.name}{" "}
                <span className="font-mono text-[#0F766E]">({tenant?.slug})</span>
              </p>
            </div>

            <div className="rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
              <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider">
                Multi-Tenant Isolation
              </span>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#16A34A]">
                <ShieldCheck className="h-4 w-4" />
                <span>Strict Database Partitioning</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#0F766E] border-[#0F766E]/30 hover:bg-[#0F766E]/5"
            >
              <a href={billingUrl} target="_blank" rel="noopener noreferrer">
                <span>{t.settings.billingPortal}</span>
                <ExternalLink className="h-3.5 w-3.5 rtl:rotate-180" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Editable Local Pharmacy Branding & Settings */}
      <Card className="border-[#E2E8F0] bg-white elevation-1">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#0F766E]" />
            <CardTitle className="text-base font-semibold text-[#0F172A]">
              {t.settings.brandingSectionTitle}
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-[#475569]">
            {t.settings.brandingSectionSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Receipt Header Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0F172A]">
                {t.settings.receiptHeader}
              </label>
              <textarea
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                placeholder={t.settings.receiptHeaderPlaceholder}
                rows={3}
                className="w-full rounded-[8px] border border-[#CBD5E1] bg-white p-2.5 text-xs text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
              <p className="text-[11px] text-[#64748B]">
                {t.settings.receiptHeaderHelp}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tax ID / VAT Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">
                  {t.settings.taxId}
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder={t.settings.taxIdPlaceholder}
                  className="w-full rounded-[8px] border border-[#CBD5E1] bg-white p-2 text-xs font-mono text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                />
              </div>

              {/* Default Operating Currency */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0F172A]">
                  {t.settings.defaultCurrency}
                </label>
                <div className="relative">
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full rounded-[8px] border border-[#CBD5E1] bg-white p-2 text-xs font-mono text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  >
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="GBP">GBP - British Pound (£)</option>
                    <option value="SAR">SAR - Saudi Riyal (ر.س)</option>
                    <option value="AED">AED - UAE Dirham (د.إ)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-[#0F766E] hover:bg-[#115E59]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t.settings.saving}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{t.settings.saveSettings}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
