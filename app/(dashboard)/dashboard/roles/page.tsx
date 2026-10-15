"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertCircle,
  Users,
  KeyRound,
  FileText,
  Search,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface PermissionItem {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  permissions: Array<{
    permission: {
      id: string;
      code: string;
      name: string;
      module: string;
    };
  }>;
  _count?: {
    users: number;
  };
}

export default function RolesPage() {
  const { t } = useI18n();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search filter
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        fetch("/api/iam/roles"),
        fetch("/api/iam/permissions"),
      ]);

      const [rolesData, permsData] = await Promise.all([
        rolesRes.json(),
        permsRes.json(),
      ]);

      if (rolesRes.ok && rolesData.success) {
        setRoles(rolesData.data || []);
      }
      if (permsRes.ok && permsData.success) {
        setAvailablePermissions(permsData.data || []);
      }
    } catch (err: any) {
      setErrorMsg("Failed to load roles and permissions data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Group permissions by module
  const permissionsByModule = availablePermissions.reduce((acc, perm) => {
    const mod = perm.module || "GENERAL";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {} as Record<string, PermissionItem[]>);

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleModulePermissions = (moduleName: string) => {
    const modulePerms = permissionsByModule[moduleName].map((p) => p.code);
    const allSelected = modulePerms.every((p) => selectedPermissions.includes(p));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modulePerms])));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/iam/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
          permissionCodes: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create role");
      }

      setSuccessMsg(`Role "${roleName}" successfully created.`);
      setShowCreateModal(false);
      setRoleName("");
      setRoleDescription("");
      setSelectedPermissions([]);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.roles.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.roles.description}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowCreateModal(true);
            setErrorMsg(null);
          }}
          className="bg-[#0F766E] text-white hover:bg-[#115E59]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.roles.createNewRole}
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Filter roles by title or scope..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Roles Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading roles...</div>
      ) : filteredRoles.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-xs text-slate-400">
          {t.roles.noRoles}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <Card
              key={role.id}
              className="flex flex-col justify-between border-[#E2E8F0] bg-white transition-all hover:shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                      {role.name}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {role.description || "Operational pharmacy role"}
                    </CardDescription>
                  </div>
                  {role.isSystem && (
                    <Badge variant="outline" className="border-slate-300 bg-slate-50 text-[10px]">
                      System
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                    <span>{role.permissions?.length || 0} Permissions</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{role._count?.users || 0} Staff</span>
                  </span>
                </div>

                {/* Badges preview */}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-hidden">
                  {role.permissions?.slice(0, 6).map((rp) => (
                    <span
                      key={rp.permission.id}
                      className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-mono text-teal-800 border border-teal-100"
                    >
                      {rp.permission.code}
                    </span>
                  ))}
                  {(role.permissions?.length || 0) > 6 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                      +{(role.permissions?.length || 0) - 6} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE ROLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-[#0F766E]">
                <ShieldCheck className="h-5 w-5" />
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  {t.roles.createNewRole}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Define role title and toggle granular privileges across operational modules.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateRole} className="flex flex-col overflow-hidden">
              <div className="space-y-4 overflow-y-auto p-6 max-h-[60vh]">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.roles.roleName}
                  </label>
                  <Input
                    required
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder={t.roles.roleNamePlaceholder}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.roles.descriptionLabel}
                  </label>
                  <Input
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder={t.roles.descriptionPlaceholder}
                    className="text-xs"
                  />
                </div>

                {/* Permissions Matrix */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.roles.assignedPermissions} ({selectedPermissions.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPermissions(availablePermissions.map((p) => p.code))
                        }
                        className="text-[11px] text-[#0F766E] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(permissionsByModule).map(([mod, perms]) => {
                      const allSelected = perms.every((p) =>
                        selectedPermissions.includes(p.code)
                      );

                      return (
                        <div
                          key={mod}
                          className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
                        >
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                            <span className="text-xs font-bold text-slate-800 tracking-wider">
                              {mod}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleModulePermissions(mod)}
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-900"
                            >
                              {allSelected ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {perms.map((perm) => {
                              const isChecked = selectedPermissions.includes(perm.code);
                              return (
                                <div
                                  key={perm.id}
                                  onClick={() => togglePermission(perm.code)}
                                  className={`flex items-start gap-2 rounded border p-2 cursor-pointer transition-colors ${
                                    isChecked
                                      ? "border-teal-300 bg-teal-50/70"
                                      : "border-slate-200 bg-white hover:border-slate-300"
                                  }`}
                                >
                                  <div
                                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded border ${
                                      isChecked
                                        ? "border-[#0F766E] bg-[#0F766E] text-white"
                                        : "border-slate-300 bg-white"
                                    }`}
                                  >
                                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="font-mono text-[11px] font-bold text-slate-800">
                                      {perm.code}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {perm.description || perm.name}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 bg-slate-50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !roleName.trim()}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  {isSubmitting ? "Saving Role..." : t.roles.createButton}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
