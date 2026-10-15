"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Stethoscope,
  Search,
  Plus,
  AlertCircle,
  FileText,
  Building,
  Phone,
  Mail,
  X,
  Award,
  Filter,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface DoctorRecord {
  id: string;
  name: string;
  specialization?: string | null;
  licenseNumber?: string | null;
  hospitalAffiliation?: string | null;
  phone?: string | null;
  email?: string | null;
  _count?: {
    prescriptions: number;
  };
  createdAt: string;
}

export default function DoctorsPage() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSpecialization, setFormSpecialization] = useState("");
  const [formLicenseNumber, setFormLicenseNumber] = useState("");
  const [formHospital, setFormHospital] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");

  const fetchDoctors = async (query = "") => {
    try {
      setIsLoading(true);
      const url = query
        ? `/api/clinical/doctors?search=${encodeURIComponent(query)}`
        : "/api/clinical/doctors";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setDoctors(data.data);
      } else {
        setError(data.error?.message || "Failed to load doctors");
      }
    } catch {
      setError("Network error while loading physician registry");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSpecialization.trim() || !formLicenseNumber.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formName.trim(),
        specialization: formSpecialization.trim(),
        licenseNumber: formLicenseNumber.trim(),
        hospitalAffiliation: formHospital.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
      };

      const res = await fetch("/api/clinical/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to register doctor");
      }

      setShowAddModal(false);
      setFormName("");
      setFormSpecialization("");
      setFormLicenseNumber("");
      setFormHospital("");
      setFormPhone("");
      setFormEmail("");
      fetchDoctors();
    } catch (err: any) {
      setError(err.message || "An error occurred while saving prescriber");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.doctors.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.doctors.description}
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#0F766E] text-white hover:bg-[#115E59]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.doctors.addDoctor}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t.doctors.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchDoctors(e.target.value);
                }}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDoctors(search)}
              className="text-xs"
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              {t.actions.filter}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Doctors Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-[#0F766E]" />
              {t.doctors.title}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {doctors.length} Physicians
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3">{t.doctors.doctorName}</th>
                  <th className="px-4 py-3">{t.doctors.specialization}</th>
                  <th className="px-4 py-3">{t.doctors.licenseNumber}</th>
                  <th className="px-4 py-3">{t.doctors.hospitalAffiliation}</th>
                  <th className="px-4 py-3">{t.doctors.phone}</th>
                  <th className="px-4 py-3 text-center">{t.doctors.rxCount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {t.common.loading}
                    </td>
                  </tr>
                ) : doctors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {t.doctors.noDoctors}
                    </td>
                  </tr>
                ) : (
                  doctors.map((doctor) => (
                    <tr key={doctor.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {doctor.name}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <Badge variant="secondary" className="font-normal text-[11px]">
                          {doctor.specialization || "General Medicine"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-[#0F766E]" />
                          <span>{doctor.licenseNumber || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {doctor.hospitalAffiliation ? (
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                            <span>{doctor.hospitalAffiliation}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Independent Practice</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {doctor.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-[#0F766E]">
                        {doctor._count?.prescriptions ?? 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* QUICK ADD DOCTOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-[#0F766E]" />
                    {t.doctors.addDoctor}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Register physician credentials for verified prescription intake
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleCreateDoctor}>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.doctors.doctorName} *
                  </label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={t.doctors.doctorNamePlaceholder}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.doctors.specialization} *
                  </label>
                  <Input
                    required
                    value={formSpecialization}
                    onChange={(e) => setFormSpecialization(e.target.value)}
                    placeholder={t.doctors.specializationPlaceholder}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.doctors.licenseNumber} *
                  </label>
                  <Input
                    required
                    value={formLicenseNumber}
                    onChange={(e) => setFormLicenseNumber(e.target.value)}
                    placeholder={t.doctors.licensePlaceholder}
                    className="text-xs font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.doctors.hospitalAffiliation}
                  </label>
                  <Input
                    value={formHospital}
                    onChange={(e) => setFormHospital(e.target.value)}
                    placeholder={t.doctors.hospitalPlaceholder}
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.doctors.phone}
                    </label>
                    <Input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+1-555-0192"
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.doctors.email}
                    </label>
                    <Input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="doctor@hospital.org"
                      className="text-xs"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
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
                  disabled={isSubmitting || !formName.trim() || !formSpecialization.trim() || !formLicenseNumber.trim()}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  {isSubmitting ? "Saving..." : t.doctors.saveDoctor}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
