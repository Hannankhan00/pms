import React from "react";
import { cookies } from "next/headers";
import { getTenantContext } from "@/lib/tenant/context";
import { BranchService } from "@/services/branch.service";
import { TenantService } from "@/services/tenant.service";
import { getUserPermissions } from "@/lib/permissions/permission-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/lib/i18n";
import {
  ShieldCheck,
  Building2,
  Users,
  Database,
  Lock,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value;
  const t = getDictionary(locale);

  const context = await getTenantContext();
  const tenantService = new TenantService();
  const tenant = await tenantService.getTenant(context.tenantId);

  const branchService = new BranchService(context.tenantId);
  const branches = await branchService.listBranches();

  const permissions = await getUserPermissions(context.userId, context.tenantId);

  return (
    <div className="space-y-8">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.dashboard.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.dashboard.foundationActive}
          </Badge>
          <Badge variant="secondary" className="gap-1 px-3 py-1 font-mono text-xs">
            Tenant: {tenant.slug}
          </Badge>
        </div>
      </div>

      {/* Metric / Architectural Verification Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.metricMultiTenancy}</CardTitle>
            <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">{t.dashboard.active}</div>
            <p className="mt-1 text-xs text-[#475569]">
              Enforced by <code className="font-mono text-[#0F766E]">tenantDb()</code> scoping
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.metricBranches}</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {branches.length}
            </div>
            <p className="mt-1 text-xs text-[#475569]">{t.dashboard.scopedTo} {tenant.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.metricHub}</CardTitle>
            <Lock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="truncate font-mono text-sm font-bold text-[#0F172A]">
              {context.hubUserId}
            </div>
            <p className="mt-1 text-xs text-[#475569]">{t.dashboard.readyForHub}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.metricPermissions}</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0F172A]">
              {permissions.length}
            </div>
            <p className="mt-1 text-xs text-[#475569]">{t.dashboard.granularAcl}</p>
          </CardContent>
        </Card>
      </div>

      {/* Architectural Pillars Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-teal-600" />
              Multi-Tenancy & Data Scoping Rules
            </CardTitle>
            <CardDescription>
              Rules enforced across all repositories, services, and queries
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Tenant Isolation:</strong> Every
                pharmacy record contains <code className="font-mono text-teal-600">tenantId</code>{" "}
                and is indexed appropriately.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Zero Global Queries:</strong>{" "}
                Data access is routed via{" "}
                <code className="font-mono text-teal-600">tenantDb(tenantId)</code> to prevent
                accidental cross-tenant leaks.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Hub-Ready Identity:</strong>{" "}
                Local membership table maps to global identity via{" "}
                <code className="font-mono text-teal-600">hubUserId</code>.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Ledger-Based Inventory:</strong>{" "}
                Future stock mutations will append ledger entries rather than mutative field
                increments.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-blue-600" />
              Database & Service Layer Status
            </CardTitle>
            <CardDescription>MySQL + Prisma ORM + Modular Monolith</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">MySQL Connection:</strong> Active
                connection pool with Prisma Client 6.4.1.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Migrations:</strong> Initial
                migration applied (<code className="font-mono">init_multi_tenant_foundation</code>).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Layer Separation:</strong> Clear
                separation: Routes &rarr; Services &rarr; Repositories &rarr; Prisma.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <strong className="text-slate-900 dark:text-white">Phase Boundary:</strong> Business
                modules (sales, inventory ledger, prescriptions) are deferred until subsequent
                phases.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Data Section: Pharmacy Branches Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t.dashboard.branchesTableTitle}</CardTitle>
              <CardDescription>
                {t.dashboard.branchesTableDesc}
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Tenant: {context.tenantId}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#475569] tabular-nums">
              <thead className="h-9 border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
                <tr>
                  <th className="px-6 py-2">{t.dashboard.branchCode}</th>
                  <th className="px-6 py-2">{t.dashboard.branchName}</th>
                  <th className="px-6 py-2">{t.dashboard.address}</th>
                  <th className="px-6 py-2">{t.dashboard.phone}</th>
                  <th className="px-6 py-2 text-right">{t.dashboard.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {branches.map((branch) => (
                  <tr key={branch.id} className="h-12 transition-colors hover:bg-[#F8FAFC]">
                    <td className="px-6 py-3 font-mono font-medium text-[#0F172A]">
                      {branch.code}
                    </td>
                    <td className="px-6 py-3 font-medium text-[#0F172A]">
                      {branch.name}
                    </td>
                    <td className="px-6 py-3 text-xs text-[#475569]">{branch.address || "—"}</td>
                    <td className="px-6 py-3 font-mono text-xs text-[#475569]">{branch.phone || "—"}</td>
                    <td className="px-6 py-3 text-right">
                      {branch.isActive ? (
                        <Badge variant="success">{t.dashboard.activeStatus}</Badge>
                      ) : (
                        <Badge variant="secondary">{t.dashboard.inactiveStatus}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
