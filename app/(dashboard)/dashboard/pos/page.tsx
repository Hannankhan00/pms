import React from "react";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/context";
import { CatalogService } from "@/services/catalog.service";
import { BranchService } from "@/services/branch.service";
import { PosTerminal } from "@/components/pos/pos-terminal";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const t = getDictionary(locale);

  const context = await getTenantContext();
  const catalogService = new CatalogService(context.tenantId);
  const branchService = new BranchService(context.tenantId);

  const [{ items: rawMedicines }, rawBranches] = await Promise.all([
    catalogService.listMedicines({ limit: 100 }),
    branchService.listBranches(),
  ]);

  // Serialize Decimal objects to numbers for Client Component boundary
  const medicines = rawMedicines.map((m: any) => ({
    id: m.id,
    sku: m.sku,
    name: m.name,
    category: m.category,
    batches: (m.batches || []).map((b: any) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString() : "",
      sellingPrice: Number(b.sellingPrice),
    })),
  }));

  const branches = rawBranches.map((b: any) => ({
    id: b.id,
    code: b.code,
    name: b.name,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
          {t.pos.title}
        </h1>
        <p className="text-sm text-[#475569]">
          {t.pos.description}
        </p>
      </div>

      <PosTerminal medicines={medicines} branches={branches} />
    </div>
  );
}
