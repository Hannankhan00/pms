import React from "react";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/context";
import { InventoryService } from "@/services/inventory.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
  Plus,
  Scale,
  Calendar,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n";
import { InventoryTransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ transactionType?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const t = getDictionary(locale);

  const resolvedParams = searchParams ? await searchParams : {};
  const transactionType = resolvedParams.transactionType as InventoryTransactionType | undefined;

  const context = await getTenantContext();
  const inventoryService = new InventoryService(context.tenantId);
  const { items: ledgerEntries, total: totalLedger } = await inventoryService.listLedger({
    transactionType: transactionType || undefined,
    limit: 100,
  });

  const purchaseCount = ledgerEntries.filter(
    (e: any) => e.transactionType === InventoryTransactionType.PURCHASE
  ).length;
  const saleCount = ledgerEntries.filter(
    (e: any) => e.transactionType === InventoryTransactionType.SALE
  ).length;
  const adjustmentCount = ledgerEntries.filter(
    (e: any) => e.transactionType === InventoryTransactionType.ADJUSTMENT
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.inventory.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.inventory.description}
          </p>
        </div>

        <Button className="gap-2">
          <Scale className="h-4 w-4" />
          {t.inventory.adjustStock}
        </Button>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Inbound Purchases
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{purchaseCount}</div>
            <p className="text-xs text-[#94A3B8]">Stock receipts from verified POs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Outbound Dispenses
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{saleCount}</div>
            <p className="text-xs text-[#94A3B8]">Point of Sale fulfilled orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Audit Adjustments
            </CardTitle>
            <RefreshCcw className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{adjustmentCount}</div>
            <p className="text-xs text-[#94A3B8]">Physical reconciliation records</p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="border-b border-[#E2E8F0] pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-[#0F172A]">
                Immutable Movement Journal
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time double-entry journal records isolated by tenant ID
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {ledgerEntries.length} Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                <tr>
                  <th className="py-3 px-4">{t.inventory.recordedAt}</th>
                  <th className="py-3 px-4">{t.inventory.movementType}</th>
                  <th className="py-3 px-4">Medicine Item</th>
                  <th className="py-3 px-4">{t.inventory.batch}</th>
                  <th className="py-3 px-4 text-right">{t.inventory.quantity}</th>
                  <th className="py-3 px-4">{t.inventory.reference}</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#0F172A]">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Boxes className="h-8 w-8 text-slate-300" />
                        <span className="text-sm font-medium">{t.inventory.noRecords}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((entry: any) => {
                    const qty = Number(entry.quantity);
                    const isPositive = qty > 0;

                    let typeBadgeVariant: "success" | "secondary" | "destructive" | "outline" = "outline";
                    let typeClass = "";

                    if (entry.transactionType === "PURCHASE") {
                      typeBadgeVariant = "success";
                    } else if (entry.transactionType === "SALE") {
                      typeBadgeVariant = "secondary";
                      typeClass = "bg-blue-50 text-blue-700 border-blue-200";
                    } else if (entry.transactionType === "ADJUSTMENT") {
                      typeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    }

                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={typeBadgeVariant} className={`text-[10px] font-mono ${typeClass}`}>
                            {entry.transactionType}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {entry.medicine?.name || "Unknown Medicine"}
                          <div className="font-mono text-[10px] text-slate-400">
                            SKU: {entry.medicine?.sku}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {entry.batch?.batchNumber || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-mono font-bold ${
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isPositive ? `+${qty.toFixed(2)}` : qty.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {entry.referenceType ? `${entry.referenceType}: ` : ""}
                          <span className="truncate">{entry.referenceId || "-"}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {entry.notes || "-"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
