import React from "react";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/context";
import { CatalogService } from "@/services/catalog.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pill,
  Search,
  Plus,
  ShieldAlert,
  AlertTriangle,
  Layers,
  FileCheck2,
} from "lucide-react";
import { getDictionary } from "@/lib/i18n";

import { AddMedicineDialog } from "@/components/catalog/add-medicine-dialog";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; categoryId?: string }>;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const t = getDictionary(locale);

  const resolvedParams = searchParams ? await searchParams : {};
  const search = resolvedParams.search ?? "";

  const context = await getTenantContext();
  const catalogService = new CatalogService(context.tenantId);
  const { items: medicines, total: totalMedicines } = await catalogService.listMedicines({
    search: search || undefined,
    limit: 100,
  });

  const rxCount = medicines.filter((m: any) => m.isPrescriptionRequired).length;
  const narcoticCount = medicines.filter((m: any) => m.isNarcotic).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.catalog.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.catalog.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AddMedicineDialog buttonLabel={t.catalog.addMedicine} />
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Total Products
            </CardTitle>
            <Pill className="h-4 w-4 text-[#0F766E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{totalMedicines}</div>
            <p className="text-xs text-[#94A3B8]">Active registered pharmaceutical SKUs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Prescription Controlled
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{rxCount}</div>
            <p className="text-xs text-[#94A3B8]">Requires verified physician prescription</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
              Narcotic / Regulated
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-[#0F172A]">{narcoticCount}</div>
            <p className="text-xs text-[#94A3B8]">Requires strict regulatory audit tracking</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <form method="GET" className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                name="search"
                defaultValue={search}
                placeholder={t.catalog.searchPlaceholder}
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" variant="secondary" className="text-xs">
              {t.actions.search}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Medicines Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                <tr>
                  <th className="py-3 px-4">{t.catalog.sku}</th>
                  <th className="py-3 px-4">{t.catalog.medicineName}</th>
                  <th className="py-3 px-4">{t.catalog.generic}</th>
                  <th className="py-3 px-4">{t.catalog.category}</th>
                  <th className="py-3 px-4">{t.catalog.dosage}</th>
                  <th className="py-3 px-4 text-center">{t.catalog.reorderLevel}</th>
                  <th className="py-3 px-4 text-center">{t.catalog.batches}</th>
                  <th className="py-3 px-4 text-right">Regulatory Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#0F172A]">
                {medicines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Pill className="h-8 w-8 text-slate-300" />
                        <span className="text-sm font-medium">{t.catalog.noMedicines}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  medicines.map((med: any) => (
                    <tr key={med.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-medium text-[#0F766E]">
                        {med.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{med.name}</div>
                        {(med.nameAr || med.nameFr || med.nameIt) && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {med.nameAr && <span>AR: {med.nameAr}</span>}
                            {med.nameFr && <span>FR: {med.nameFr}</span>}
                            {med.nameIt && <span>IT: {med.nameIt}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {med.generic?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {med.category?.name || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {med.dosageForm?.name || "-"} {med.strength ? `(${med.strength})` : ""}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {med.reorderLevel}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {med.batches?.length || 0} batches
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {med.isPrescriptionRequired && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                              Rx Required
                            </Badge>
                          )}
                          {med.isNarcotic && (
                            <Badge variant="destructive" className="text-[10px]">
                              Narcotic
                            </Badge>
                          )}
                          {!med.isPrescriptionRequired && !med.isNarcotic && (
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              OTC
                            </Badge>
                          )}
                        </div>
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
