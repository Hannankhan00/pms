"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Search,
  UserCheck,
  UserX,
  Lock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

interface BranchOption {
  id: string;
  code: string;
  name: string;
}

interface StaffItem {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  hubUserId: string;
  isActive: boolean;
  createdAt: string;
  role: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export default function StaffPage() {
  const { t } = useI18n();
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Feedback State
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [staffRes, rolesRes, branchesRes] = await Promise.all([
        fetch("/api/iam/staff"),
        fetch("/api/iam/roles"),
        fetch("/api/branches"),
      ]);

      const [staffData, rolesData, branchesData] = await Promise.all([
        staffRes.json(),
        rolesRes.json(),
        branchesRes.json(),
      ]);

      if (staffRes.ok && staffData.success) {
        setStaffList(staffData.data || []);
      }
      if (rolesRes.ok && rolesData.success) {
        setRoles(rolesData.data || []);
        if (rolesData.data?.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rolesData.data[0].id);
        }
      }
      if (branchesRes.ok && branchesData.success) {
        setBranches(branchesData.data || []);
        if (branchesData.data?.length > 0 && !selectedBranchId) {
          setSelectedBranchId(branchesData.data[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg("Failed to load staff management data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !selectedRoleId) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/iam/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          roleId: selectedRoleId,
          branchId: selectedBranchId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to add staff member");
      }

      setSuccessMsg(`Staff member "${fullName}" registered successfully.`);
      setShowAddModal(false);
      setFullName("");
      setEmail("");
      setPhone("");
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffItem) => {
    setTogglingId(staff.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const newStatus = !staff.isActive;
      const res = await fetch("/api/iam/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staff.id,
          isActive: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update staff status");
      }

      setSuccessMsg(
        `Staff status for "${staff.name}" updated to ${newStatus ? "Active" : "Suspended"}.`
      );
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, isActive: newStatus } : s))
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to change staff status");
    } finally {
      setTogglingId(null);
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.role && s.role.name.toLowerCase().includes(search.toLowerCase())) ||
      (s.branch && s.branch.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.staff.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.staff.description}
          </p>
        </div>
        <Button
          onClick={() => {
            setShowAddModal(true);
            setErrorMsg(null);
          }}
          className="bg-[#0F766E] text-white hover:bg-[#115E59]"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {t.staff.addStaff}
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
          placeholder="Filter staff by name, role, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Staff Directory Table */}
      <Card className="border-[#E2E8F0] shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">Personnel</th>
                  <th className="px-4 py-3">{t.staff.role}</th>
                  <th className="px-4 py-3">{t.staff.branch}</th>
                  <th className="px-4 py-3">Hub Identity</th>
                  <th className="px-4 py-3">{t.staff.status}</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Loading staff directory...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {t.staff.noStaff}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{staff.name}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {staff.email}
                          </span>
                          {staff.phone && (
                            <>
                              <span>|</span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {staff.phone}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-800 text-[11px] font-medium"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3 text-[#0F766E]" />
                          {staff.role?.name || "Unassigned"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {staff.branch ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{staff.branch.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">
                              ({staff.branch.code})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">All Branches</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {staff.hubUserId}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            staff.isActive
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-red-300 bg-red-50 text-red-800"
                          }
                        >
                          {staff.isActive ? t.staff.active : t.staff.suspended}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={togglingId === staff.id}
                          onClick={() => handleToggleStatus(staff)}
                          className={`h-7 px-2.5 text-xs ${
                            staff.isActive
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          }`}
                        >
                          {staff.isActive ? (
                            <>
                              <UserX className="mr-1 h-3 w-3" />
                              {t.staff.suspend}
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-3 w-3" />
                              {t.staff.activate}
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ADD STAFF MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-[#0F766E]">
                <UserPlus className="h-5 w-5" />
                <CardTitle className="text-base font-bold text-[#0F172A]">
                  {t.staff.addStaff}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Register pharmacy personnel, link identity, and assign operational branch.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleAddStaff}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.staff.fullName}
                  </label>
                  <Input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins, Omar Farooq"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.staff.email}
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@pharmacy.local"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.staff.phone} (Optional)
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.staff.role}
                  </label>
                  <select
                    required
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.staff.branch} (Optional)
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
                  >
                    <option value="">All Branches / HQ</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 bg-slate-50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !fullName.trim() || !email.trim()}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  {isSubmitting ? "Registering..." : t.staff.addStaff}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
