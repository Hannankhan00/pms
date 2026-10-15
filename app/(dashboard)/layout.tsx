import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getTenantContext } from "@/lib/tenant/context";
import { TenantService } from "@/services/tenant.service";
import { BranchRepository } from "@/repositories/branch.repository";
import { tenantDb } from "@/lib/tenant/tenant-db";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const context = await getTenantContext();
  const tenantService = new TenantService();
  const tenant = await tenantService.getTenant(context.tenantId);

  const branchRepo = new BranchRepository(context.tenantId);
  const branches = await branchRepo.findAll({ activeOnly: true });
  const activeBranch = branches[0];

  const db = tenantDb(context.tenantId);
  const user = await db.user.findUnique({
    where: { id: context.userId },
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          tenantName={tenant.name}
          branchName={activeBranch ? `${activeBranch.name} (${activeBranch.code})` : undefined}
          userName={user?.name}
          roleName={user?.role?.name}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
