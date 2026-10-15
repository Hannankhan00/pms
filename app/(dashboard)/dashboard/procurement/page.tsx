import React from "react";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/context";
import { ProcurementService } from "@/services/procurement.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  Plus,
  Receipt,
  Building2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { formatMoney, CurrencyCode } from "@/lib/currency/currency";

export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const currency = (cookieStore.get("NEXT_CURRENCY")?.value as CurrencyCode) || "USD";
  const t = getDictionary(locale);

  const context = await getTenantContext();
  const procurementService = new ProcurementService(context.tenantId);
  const { items: purchases, total: totalPurchases } = await procurementService.listPurchases({
    limit: 50,
  });

  const totalInvoiced = purchases.reduce(
    (acc: number, p: any) => acc + Number(p.totalAmount),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.procurement.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.procurement.description}
          </p>
        </div>

        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          {t.procurement.newPurchase}
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Total Inbound Orders
            </CardTitle>
            <Truck className="h-4 w-4 text-[#0F766E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{purchases.length}</div>
            <p className="text-xs text-[#94A3B8]">Recorded purchase transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Total Procurement Value
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">
              {formatMoney(totalInvoiced, currency)}
            </div>
            <p className="text-xs text-[#94A3B8]">Cumulative invoiced purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Status Architecture
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {purchases.filter((p: any) => p.status === "COMPLETED").length} Fulfilled
            </div>
            <p className="text-xs text-[#94A3B8]">Stock committed directly to double-entry ledger</p>
          </CardContent>
        </Card>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader className="border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Supplier Purchase Orders
              </CardTitle>
              <CardDescription className="text-xs">
                Inbound supplier shipments received and credited to warehouse inventory
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {purchases.length} Orders
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                <tr>
                  <th className="py-3 px-4">{t.procurement.invoiceNo}</th>
                  <th className="py-3 px-4">{t.procurement.supplier}</th>
                  <th className="py-3 px-4">{t.procurement.purchaseDate}</th>
                  <th className="py-3 px-4 text-center">{t.procurement.itemsCount}</th>
                  <th className="py-3 px-4 text-right">{t.procurement.totalAmount}</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#0F172A]">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Truck className="h-8 w-8 text-slate-300" />
                        <span className="text-sm font-medium">{t.procurement.noPurchases}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchases.map((po: any) => (
                    <tr key={po.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0F766E]">
                        {po.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {po.supplier?.name || "Unknown Supplier"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(po.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {po.items?.length || 0} batches
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatMoney(Number(po.totalAmount), currency)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={po.status === "COMPLETED" ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {po.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
