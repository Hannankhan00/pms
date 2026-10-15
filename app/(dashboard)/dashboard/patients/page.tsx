"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HeartPulse,
  Search,
  Plus,
  AlertTriangle,
  UserCheck,
  FileText,
  Calendar,
  X,
  CreditCard,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  creditLimit: number;
  currentBalance: number;
}

interface PatientRecord {
  id: string;
  name: string;
  dob?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  customerId?: string | null;
  customer?: CustomerOption | null;
  prescriptions?: Array<{
    id: string;
    prescriptionNumber: string;
    status: string;
  }>;
  createdAt: string;
}

interface PatientDetailRecord extends PatientRecord {
  prescriptions: Array<{
    id: string;
    prescriptionNumber: string;
    prescriptionDate: string;
    status: string;
    notes?: string | null;
    doctor?: {
      name: string;
      specialization?: string | null;
      licenseNumber?: string | null;
    } | null;
    verifiedBy?: {
      name: string;
      email: string;
    } | null;
    items: Array<{
      id: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantityRequired: number;
      medicine: {
        id: string;
        name: string;
        genericName?: string | null;
        strength?: string | null;
        isPrescriptionRequired: boolean;
      };
    }>;
  }>;
}

function calculateAge(dobString?: string | null) {
  if (!dobString) return "N/A";
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function PatientsPage() {
  const { t, formatCurrency } = useI18n();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Modal State
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientDetail, setPatientDetail] = useState<PatientDetailRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // New Patient Registration Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDob, setFormDob] = useState("");
  const [formGender, setFormGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [formBloodGroup, setFormBloodGroup] = useState("");
  const [formAllergies, setFormAllergies] = useState("");
  const [formMedicalHistory, setFormMedicalHistory] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");

  const fetchPatients = async (query = "") => {
    try {
      setIsLoading(true);
      const url = query
        ? `/api/clinical/patients?search=${encodeURIComponent(query)}`
        : "/api/clinical/patients";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setPatients(data.data);
      } else {
        setError(data.error?.message || "Failed to load patient records");
      }
    } catch {
      setError("Network error while retrieving patients");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/clinical/customers");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCustomers(data.data);
      }
    } catch {
      // Ignore customer lookup failure
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchCustomers();
  }, []);

  const openPatientProfile = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/clinical/patients/${patientId}`);
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setPatientDetail(data.data);
      }
    } catch {
      // Detail load error
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: formName.trim(),
        dob: formDob ? new Date(formDob).toISOString() : undefined,
        gender: formGender,
        bloodGroup: formBloodGroup.trim() || undefined,
        allergies: formAllergies.trim() || undefined,
        medicalHistory: formMedicalHistory.trim() || undefined,
        customerId: formCustomerId || undefined,
      };

      const res = await fetch("/api/clinical/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to register patient");
      }

      setShowRegisterModal(false);
      setFormName("");
      setFormDob("");
      setFormBloodGroup("");
      setFormAllergies("");
      setFormMedicalHistory("");
      setFormCustomerId("");
      fetchPatients();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during patient registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <Badge className="bg-teal-700 text-white hover:bg-teal-800">VERIFIED</Badge>;
      case "DISPENSED":
        return <Badge className="bg-emerald-700 text-white hover:bg-emerald-800">DISPENSED</Badge>;
      case "REJECTED":
        return <Badge className="bg-red-700 text-white hover:bg-red-800">REJECTED</Badge>;
      default:
        return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">PENDING</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.patients.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.patients.description}
          </p>
        </div>
        <Button
          onClick={() => setShowRegisterModal(true)}
          className="bg-[#0F766E] text-white hover:bg-[#115E59]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.patients.registerPatient}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={t.patients.searchPlaceholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchPatients(e.target.value);
                }}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPatients(search)}
              className="text-xs"
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              {t.actions.filter}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Data Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-[#0F766E]" />
              {t.patients.title}
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {patients.length} Registered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3">{t.patients.patientName}</th>
                  <th className="px-4 py-3">{t.patients.gender} / {t.patients.age}</th>
                  <th className="px-4 py-3">{t.patients.bloodGroup}</th>
                  <th className="px-4 py-3">{t.patients.allergies}</th>
                  <th className="px-4 py-3">{t.patients.billingCustomer}</th>
                  <th className="px-4 py-3 text-center">{t.patients.prescriptionsCount}</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {t.common.loading}
                    </td>
                  </tr>
                ) : patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {t.patients.noPatients}
                    </td>
                  </tr>
                ) : (
                  patients.map((patient) => {
                    const hasAllergies = Boolean(patient.allergies && patient.allergies.trim().length > 0);
                    return (
                      <tr
                        key={patient.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => openPatientProfile(patient.id)}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {patient.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {patient.gender || "N/A"} • <span className="font-mono">{calculateAge(patient.dob)} yrs</span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {patient.bloodGroup || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {hasAllergies ? (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
                              <AlertTriangle className="mr-1 h-3 w-3 text-red-600 inline" />
                              {patient.allergies}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">{t.patients.noAllergies}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {patient.customer ? (
                            <div>
                              <span className="font-medium text-slate-900">{patient.customer.name}</span>
                              {patient.customer.phone && (
                                <span className="block font-mono text-[10px] text-slate-400">
                                  {patient.customer.phone}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Self / Unlinked</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-[#0F766E]">
                          {patient.prescriptions?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-[#0F766E]/40 text-[#0F766E] hover:bg-[#0F766E]/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPatientProfile(patient.id);
                            }}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                            {t.patients.clinicalProfile}
                          </Button>
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

      {/* CLINICAL PATIENT PROFILE MODAL */}
      {selectedPatientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F766E]/10 text-[#0F766E]">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">
                      {patientDetail?.name || "Patient Profile"}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Demographics, documented allergies, and lifetime prescription timeline
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedPatientId(null);
                    setPatientDetail(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail || !patientDetail ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t.common.loading}
                </div>
              ) : (
                <>
                  {/* CRITICAL ALLERGY ALERT BANNER */}
                  {patientDetail.allergies && patientDetail.allergies.trim().length > 0 ? (
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 text-red-900 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-red-800">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                        <span>{t.patients.allergyAlert}</span>
                      </div>
                      <p className="text-xs text-red-700">{t.patients.allergyAlertDesc}</p>
                      <div className="mt-2 rounded bg-white/80 p-2 font-mono text-xs font-bold text-red-900 border border-red-200">
                        {patientDetail.allergies}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{t.patients.noAllergies}</span>
                    </div>
                  )}

                  {/* Demographics & Clinical Information Grid */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold text-slate-500">{t.patients.dob} / {t.patients.age}</div>
                      <div className="mt-1 font-mono text-xs font-bold text-slate-800">
                        {patientDetail.dob ? new Date(patientDetail.dob).toLocaleDateString() : "Unspecified"} ({calculateAge(patientDetail.dob)} yrs)
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold text-slate-500">{t.patients.gender} / {t.patients.bloodGroup}</div>
                      <div className="mt-1 font-mono text-xs font-bold text-slate-800">
                        {patientDetail.gender || "N/A"} • Blood: {patientDetail.bloodGroup || "—"}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold text-slate-500">{t.patients.billingCustomer}</div>
                      <div className="mt-1 text-xs font-bold text-slate-800 truncate">
                        {patientDetail.customer?.name || "Self Billing"}
                      </div>
                    </div>
                  </div>

                  {/* Medical History */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-700">{t.patients.medicalHistory}</div>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 font-mono leading-relaxed">
                      {patientDetail.medicalHistory || "No past medical conditions or chronic diseases recorded."}
                    </div>
                  </div>

                  {/* Customer Financial / Account Link */}
                  {patientDetail.customer && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#0F766E]" />
                        {t.patients.financialAccount} ({patientDetail.customer.name})
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded border border-slate-200 p-2.5 bg-slate-50">
                          <div className="text-slate-500">{t.patients.creditLimit}</div>
                          <div className="font-mono font-bold text-slate-900 mt-0.5">
                            {formatCurrency(patientDetail.customer.creditLimit)}
                          </div>
                        </div>
                        <div className="rounded border border-slate-200 p-2.5 bg-slate-50">
                          <div className="text-slate-500">{t.patients.currentBalance}</div>
                          <div className="font-mono font-bold text-slate-900 mt-0.5">
                            {formatCurrency(patientDetail.customer.currentBalance)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lifetime Prescription History Timeline */}
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#0F766E]" />
                        Prescription Orders & Regimens ({patientDetail.prescriptions?.length || 0})
                      </div>
                    </div>

                    {!patientDetail.prescriptions || patientDetail.prescriptions.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No prescriptions recorded for this patient.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {patientDetail.prescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 text-xs shadow-sm"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#0F766E]">
                                  {rx.prescriptionNumber}
                                </span>
                                {getStatusBadge(rx.status)}
                              </div>
                              <span className="font-mono text-[11px] text-slate-400">
                                {new Date(rx.prescriptionDate).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-600 text-[11px]">
                              <div>
                                Prescriber:{" "}
                                <span className="font-medium text-slate-900">
                                  {rx.doctor ? `Dr. ${rx.doctor.name} (${rx.doctor.specialization || "MD"})` : "External / Clinic"}
                                </span>
                              </div>
                              {rx.verifiedBy && (
                                <div className="text-teal-800 font-medium">
                                  Verified by: {rx.verifiedBy.name}
                                </div>
                              )}
                            </div>

                            {/* Prescribed Items Table */}
                            <div className="rounded border border-slate-100 bg-slate-50/50 overflow-hidden mt-1">
                              <table className="w-full text-left text-[11px]">
                                <thead className="border-b border-slate-100 font-semibold text-slate-600 bg-slate-100/70">
                                  <tr>
                                    <th className="px-2.5 py-1.5">Medicine</th>
                                    <th className="px-2.5 py-1.5">Dosage</th>
                                    <th className="px-2.5 py-1.5">Frequency</th>
                                    <th className="px-2.5 py-1.5">Duration</th>
                                    <th className="px-2.5 py-1.5 text-right">Qty</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {rx.items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="px-2.5 py-1 font-medium text-slate-900">
                                        {item.medicine.name}
                                        {item.medicine.isPrescriptionRequired && (
                                          <Badge className="ml-1 bg-red-100 text-red-800 text-[9px] px-1 py-0">
                                            Rx
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="px-2.5 py-1 font-mono text-slate-600">{item.dosage}</td>
                                      <td className="px-2.5 py-1 text-slate-600">{item.frequency}</td>
                                      <td className="px-2.5 py-1 text-slate-600">{item.duration}</td>
                                      <td className="px-2.5 py-1 text-right font-mono font-bold text-slate-800">
                                        {item.quantityRequired}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* REGISTER PATIENT MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    {t.patients.registerPatient}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Create new patient entity with clinical demographics and sensitivities
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowRegisterModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleRegisterPatient}>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.patients.patientName} *
                  </label>
                  <Input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Eleanor Rigby"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.patients.dob}
                    </label>
                    <Input
                      type="date"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.patients.gender}
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="MALE">{t.patients.male}</option>
                      <option value="FEMALE">{t.patients.female}</option>
                      <option value="OTHER">{t.patients.other}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.patients.bloodGroup}
                    </label>
                    <Input
                      value={formBloodGroup}
                      onChange={(e) => setFormBloodGroup(e.target.value)}
                      placeholder="e.g. A+, O-, B+"
                      className="text-xs uppercase font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.patients.billingCustomer}
                    </label>
                    <select
                      value={formCustomerId}
                      onChange={(e) => setFormCustomerId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs truncate"
                    >
                      <option value="">Self Billing / Unlinked</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t.patients.allergies}
                  </label>
                  <Input
                    value={formAllergies}
                    onChange={(e) => setFormAllergies(e.target.value)}
                    placeholder={t.patients.allergiesPlaceholder}
                    className="text-xs border-red-200 bg-red-50/30"
                  />
                  <p className="text-[10px] text-slate-400">
                    Record any drug compounds that trigger severe clinical reactions.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.patients.medicalHistory}
                  </label>
                  <textarea
                    rows={2}
                    value={formMedicalHistory}
                    onChange={(e) => setFormMedicalHistory(e.target.value)}
                    placeholder={t.patients.medicalHistoryPlaceholder}
                    className="w-full rounded-md border border-slate-200 p-2 text-xs"
                  />
                </div>
              </CardContent>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegisterModal(false)}
                >
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !formName.trim()}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  {isSubmitting ? "Saving..." : t.patients.savePatient}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
