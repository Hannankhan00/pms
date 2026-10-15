import React from "react";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/context";
import { BranchService } from "@/services/branch.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const t = getDictionary(locale);

  const context = await getTenantContext();
  const branchService = new BranchService(context.tenantId);
  const branches = await branchService.listBranches();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.branches.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.branches.description}
          </p>
        </div>

        <Button className="gap-2" disabled title="Phase 1 Creation UI">
          <Plus className="h-4 w-4" />
          {t.branches.addBranch}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <Card key={b.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono text-xs">
                  {b.code}
                </Badge>
                {b.isActive ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <CardTitle className="mt-2 flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-[#0F766E]" />
                {b.name}
              </CardTitle>
              <CardDescription className="text-xs">
                ID: <span className="font-mono text-[11px]">{b.id}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-[#475569]">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                <span>{b.address || "No address specified"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                <span className="font-mono">{b.phone || "No phone specified"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
