"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Search,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  User,
  Stethoscope,
  Pill,
  X,
  Filter,
  Check,
  Calendar,
  Trash2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface PrescriptionItem {
  id: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantityRequired: number;
  quantity: number;
  instructions?: string | null;
  medicine: {
    id: string;
    name: string;
    genericName?: string | null;
    strength?: string | null;
    isPrescriptionRequired: boolean;
  };
}

interface PrescriptionRecord {
  id: string;
  prescriptionNumber: string;
  prescriptionDate: string;
  status: "PENDING" | "VERIFIED" | "DISPENSED" | "REJECTED";
  notes?: string | null;
  patient: {
    id: string;
    name: string;
    dob?: string | null;
    gender?: string | null;
    bloodGroup?: string | null;
    allergies?: string | null;
  };
  doctor?: {
    id: string;
    name: string;
    specialization?: string | null;
    licenseNumber?: string | null;
    hospitalAffiliation?: string | null;
  } | null;
  verifiedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  sale?: {
    id: string;
    receiptNumber: string;
    totalAmount: number;
    saleDate: string;
  } | null;
  items: PrescriptionItem[];
  createdAt: string;
}

interface MedicineListItem {
  id: string;
  name: string;
  strength?: string | null;
  isPrescriptionRequired: boolean;
}

interface PatientListItem {
  id: string;
  name: string;
  allergies?: string | null;
}

interface DoctorListItem {
  id: string;
  name: string;
  specialization?: string | null;
}

export default function PrescriptionsPage() {
  const { t, formatCurrency } = useI18n();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineListItem[]>([]);
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [activeTab, setActiveTab] = useState<"PENDING" | "VERIFIED" | "DISPENSED" | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review Drawer / Modal
  const [selectedRx, setSelectedRx] = useState<PrescriptionRecord | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Intake Modal
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [intakePatientId, setIntakePatientId] = useState("");
  const [intakeDoctorId, setIntakeDoctorId] = useState("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [intakeItems, setIntakeItems] = useState<
    Array<{
      medicineId: string;
      dosage: string;
      frequency: string;
      duration: string;
      quantityRequired: number;
      instructions: string;
    }>
  >([
    {
      medicineId: "",
      dosage: "500mg",
      frequency: "1x3 daily",
      duration: "5 days",
      quantityRequired: 15,
      instructions: "Take with food",
    },
  ]);
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/clinical/prescriptions");
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setPrescriptions(data.data);
      }
    } catch {
      setError("Failed to load prescription queue");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    try {
      const [medRes, patRes, docRes] = await Promise.all([
        fetch("/api/catalog/medicines?limit=100"),
        fetch("/api/clinical/patients"),
        fetch("/api/clinical/doctors"),
      ]);

      const [medData, patData, docData] = await Promise.all([
        medRes.json(),
        patRes.json(),
        docRes.json(),
      ]);

      if (medData.success && Array.isArray(medData.data?.items)) {
        setMedicines(medData.data.items);
      }
      if (patData.success && Array.isArray(patData.data)) {
        setPatients(patData.data);
      }
      if (docData.success && Array.isArray(docData.data)) {
        setDoctors(docData.data);
      }
    } catch {
      // Ignore auxiliary fetch failures
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    fetchAuxiliaryData();
  }, []);

  const handleVerifyPrescription = async (prescriptionId: string, status: "VERIFIED" | "REJECTED", notes?: string) => {
    setIsVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/clinical/prescriptions/${prescriptionId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update prescription status");
      }

      setSuccessMessage(
        status === "VERIFIED"
          ? "Prescription verified and approved for POS dispensing."
          : "Prescription rejected."
      );
      setSelectedRx(null);
      setShowRejectInput(false);
      setRejectReason("");
      fetchPrescriptions();
    } catch (err: any) {
      setError(err.message || "An error occurred during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakePatientId) {
      setError("Please select a patient for this prescription");
      return;
    }

    const validItems = intakeItems.filter((i) => i.medicineId);
    if (validItems.length === 0) {
      setError("At least one prescribed medicine item must be selected");
      return;
    }

    setIsSubmittingIntake(true);
    setError(null);

    try {
      const payload = {
        patientId: intakePatientId,
        doctorId: intakeDoctorId || undefined,
        notes: intakeNotes.trim() || undefined,
        items: validItems.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantityRequired: Number(item.quantityRequired) || 1,
          instructions: item.instructions || undefined,
        })),
      };

      const res = await fetch("/api/clinical/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create prescription");
      }

      setShowIntakeModal(false);
      setIntakePatientId("");
      setIntakeDoctorId("");
      setIntakeNotes("");
      setIntakeItems([
        {
          medicineId: "",
          dosage: "500mg",
          frequency: "1x3 daily",
          duration: "5 days",
          quantityRequired: 15,
          instructions: "Take with food",
        },
      ]);
      fetchPrescriptions();
    } catch (err: any) {
      setError(err.message || "An error occurred during intake registration");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  const addIntakeItem = () => {
    setIntakeItems([
      ...intakeItems,
      {
        medicineId: "",
        dosage: "500mg",
        frequency: "1x2 daily",
        duration: "7 days",
        quantityRequired: 14,
        instructions: "",
      },
    ]);
  };

  const removeIntakeItem = (index: number) => {
    if (intakeItems.length <= 1) return;
    setIntakeItems(intakeItems.filter((_, idx) => idx !== index));
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesTab = activeTab === "ALL" ? true : rx.status === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      rx.prescriptionNumber?.toLowerCase().includes(q) ||
      rx.patient?.name?.toLowerCase().includes(q) ||
      rx.doctor?.name?.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const pendingCount = prescriptions.filter((rx) => rx.status === "PENDING").length;
  const verifiedCount = prescriptions.filter((rx) => rx.status === "VERIFIED").length;
  const dispensedCount = prescriptions.filter((rx) => rx.status === "DISPENSED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            {t.prescriptions.title}
          </h1>
          <p className="text-sm text-[#475569]">
            {t.prescriptions.description}
          </p>
        </div>
        <Button
          onClick={() => setShowIntakeModal(true)}
          className="bg-[#0F766E] text-white hover:bg-[#115E59]"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t.prescriptions.newPrescription}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Kanban / Status Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "PENDING"
                ? "bg-[#0F766E] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{t.prescriptions.queuePending}</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VERIFIED")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "VERIFIED"
                ? "bg-[#0F766E] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t.prescriptions.queueVerified}</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {verifiedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DISPENSED")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "DISPENSED"
                ? "bg-[#0F766E] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t.prescriptions.queueDispensed}</span>
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-mono">
              {dispensedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`rounded-md px-2.5 py-1.5 font-medium text-slate-600 hover:text-slate-900 ${
              activeTab === "ALL" ? "bg-slate-200 text-slate-900" : ""
            }`}
          >
            All
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search Rx, patient, doctor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Prescriptions Queue Grid / Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            {t.common.loading}
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">
            {activeTab === "PENDING"
              ? t.prescriptions.noPending
              : activeTab === "VERIFIED"
              ? t.prescriptions.noVerified
              : "No prescriptions match active filter criteria."}
          </div>
        ) : (
          filteredPrescriptions.map((rx) => {
            const hasAllergies = Boolean(rx.patient?.allergies && rx.patient.allergies.trim().length > 0);
            return (
              <Card
                key={rx.id}
                className="overflow-hidden border-slate-200 hover:border-slate-300 transition-shadow hover:shadow-md cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedRx(rx)}
              >
                <div>
                  <div className="border-b border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-900">
                      {rx.prescriptionNumber}
                    </span>
                    <Badge
                      className={
                        rx.status === "VERIFIED"
                          ? "bg-teal-700 text-white"
                          : rx.status === "DISPENSED"
                          ? "bg-emerald-700 text-white"
                          : rx.status === "REJECTED"
                          ? "bg-red-700 text-white"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {rx.status}
                    </Badge>
                  </div>

                  <CardContent className="p-3.5 space-y-2.5 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-400">{t.prescriptions.patient}</div>
                      <div className="font-semibold text-slate-900">{rx.patient?.name}</div>
                      {hasAllergies && (
                        <div className="mt-1 flex items-center gap-1 rounded bg-red-50 p-1 text-[10px] font-medium text-red-700 border border-red-200">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-600" />
                          <span className="truncate">Allergy: {rx.patient.allergies}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between text-slate-600 text-[11px] border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-slate-400">{t.prescriptions.doctor}: </span>
                        {rx.doctor ? `Dr. ${rx.doctor.name}` : "Clinical Staff"}
                      </div>
                      <span className="font-mono text-slate-400">
                        {new Date(rx.prescriptionDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Prescribed Items Summary */}
                    <div className="space-y-1 border-t border-slate-100 pt-2">
                      <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                        Prescribed Items ({rx.items?.length || 0})
                      </div>
                      <div className="space-y-1">
                        {rx.items?.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-[11px] text-slate-700 font-mono"
                          >
                            <span className="truncate">{item.medicine?.name}</span>
                            <span className="text-slate-400">{item.dosage}</span>
                          </div>
                        ))}
                        {rx.items?.length > 2 && (
                          <div className="text-[10px] text-slate-400 italic">
                            +{rx.items.length - 2} more medications
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between text-xs">
                  {rx.status === "PENDING" ? (
                    <Button
                      size="sm"
                      className="w-full bg-[#0F766E] text-white hover:bg-[#115E59] h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRx(rx);
                      }}
                    >
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      Review & Verify
                    </Button>
                  ) : rx.status === "VERIFIED" ? (
                    <span className="text-[11px] text-teal-800 font-medium flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
                      Ready for POS Cart
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Completed: {rx.sale?.receiptNumber || "Dispensed"}
                    </span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* PRESCRIPTION CLINICAL REVIEW DRAWER / MODAL */}
      {selectedRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900">
                      Prescription Verification: {selectedRx.prescriptionNumber}
                    </CardTitle>
                    <Badge
                      className={
                        selectedRx.status === "VERIFIED"
                          ? "bg-teal-700 text-white"
                          : selectedRx.status === "DISPENSED"
                          ? "bg-emerald-700 text-white"
                          : selectedRx.status === "REJECTED"
                          ? "bg-red-700 text-white"
                          : "bg-amber-100 text-amber-800"
                      }
                    >
                      {selectedRx.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Pharmacist clinical cross-examination and allergy validation gate
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setSelectedRx(null);
                    setShowRejectInput(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* CLINICAL ALLERGY CROSS-CHECK WARNING */}
              {selectedRx.patient?.allergies && selectedRx.patient.allergies.trim().length > 0 ? (
                <div className="rounded-lg border-2 border-red-300 bg-red-50 p-3.5 text-xs text-red-900 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <span>{t.prescriptions.allergyWarningTitle}</span>
                  </div>
                  <p className="text-[11px] text-red-700">
                    {t.prescriptions.allergyWarningText}
                  </p>
                  <div className="mt-1 font-mono font-bold text-red-950 bg-white/70 p-1.5 rounded border border-red-200">
                    Documented Patient Allergies: {selectedRx.patient.allergies}
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>No recorded patient drug sensitivities on file.</span>
                </div>
              )}

              {/* Patient & Doctor Demographics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                    {t.prescriptions.patient}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{selectedRx.patient?.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Blood Group: {selectedRx.patient?.bloodGroup || "N/A"} • Gender: {selectedRx.patient?.gender || "N/A"}
                  </div>
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <div className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">
                    {t.prescriptions.doctor}
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedRx.doctor ? `Dr. ${selectedRx.doctor.name}` : "Clinical Prescriber"}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Lic: {selectedRx.doctor?.licenseNumber || "N/A"} • {selectedRx.doctor?.specialization || "MD"}
                  </div>
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-[#0F766E]" />
                  Prescribed Medication Regimens & Dosages
                </div>

                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">{t.prescriptions.medication}</th>
                        <th className="px-3 py-2">{t.prescriptions.dosage}</th>
                        <th className="px-3 py-2">{t.prescriptions.frequency}</th>
                        <th className="px-3 py-2">{t.prescriptions.duration}</th>
                        <th className="px-3 py-2 text-right">{t.prescriptions.quantityRequired}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRx.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-900">{item.medicine?.name}</span>
                            {item.medicine?.isPrescriptionRequired && (
                              <Badge className="ml-1.5 bg-red-100 text-red-800 text-[9px] px-1 py-0">
                                Rx
                              </Badge>
                            )}
                            {item.instructions && (
                              <span className="block text-[10px] text-slate-400">
                                Sig: {item.instructions}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700">{item.dosage}</td>
                          <td className="px-3 py-2 text-slate-700">{item.frequency}</td>
                          <td className="px-3 py-2 text-slate-700">{item.duration}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                            {item.quantityRequired}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedRx.notes && (
                <div className="rounded border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Clinical Notes: </span>
                  {selectedRx.notes}
                </div>
              )}

              {/* Rejection input box if triggered */}
              {showRejectInput && (
                <div className="rounded border border-red-200 bg-red-50/50 p-3 space-y-2">
                  <label className="text-xs font-semibold text-red-800">
                    {t.prescriptions.rejectionReason} *
                  </label>
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Drug contraindication with recorded patient penicillin sensitivity"
                    className="text-xs border-red-300"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setShowRejectInput(false)}
                    >
                      {t.actions.cancel}
                    </Button>
                    <Button
                      size="sm"
                      disabled={isVerifying || !rejectReason.trim()}
                      className="h-7 text-xs bg-red-600 text-white hover:bg-red-700"
                      onClick={() => handleVerifyPrescription(selectedRx.id, "REJECTED", rejectReason)}
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRx(null);
                  setShowRejectInput(false);
                }}
              >
                {t.actions.close}
              </Button>

              {selectedRx.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  {!showRejectInput && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 text-xs"
                      onClick={() => setShowRejectInput(true)}
                    >
                      <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      {t.prescriptions.rejectRx}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={isVerifying}
                    className="bg-[#0F766E] text-white hover:bg-[#115E59] text-xs"
                    onClick={() => handleVerifyPrescription(selectedRx.id, "VERIFIED")}
                  >
                    <ShieldCheck className="mr-1.5 h-4 w-4" />
                    {isVerifying ? "Verifying..." : t.prescriptions.verifyAndApprove}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* NEW PRESCRIPTION INTAKE MODAL */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#0F766E]" />
                    {t.prescriptions.newPrescription}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Register external or internal medical prescription order
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowIntakeModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <form onSubmit={handleIntakeSubmit} className="flex-1 flex flex-col overflow-hidden">
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.prescriptions.patient} *
                    </label>
                    <select
                      required
                      value={intakePatientId}
                      onChange={(e) => setIntakePatientId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="">Select Patient...</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.allergies ? `(Allergies: ${p.allergies})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      {t.prescriptions.doctor}
                    </label>
                    <select
                      value={intakeDoctorId}
                      onChange={(e) => setIntakeDoctorId(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"
                    >
                      <option value="">External / Clinic Prescriber</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.name} ({d.specialization || "MD"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dynamic Medication Line Items */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Prescribed Drug Regimens ({intakeItems.length})
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addIntakeItem}
                      className="h-6 text-[11px]"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {t.prescriptions.addItem}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {intakeItems.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">Line {index + 1}</span>
                          {intakeItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeIntakeItem(index)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-500">Medication *</label>
                          <select
                            required
                            value={item.medicineId}
                            onChange={(e) => {
                              const updated = [...intakeItems];
                              updated[index].medicineId = e.target.value;
                              setIntakeItems(updated);
                            }}
                            className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                          >
                            <option value="">Select Prescribed Drug...</option>
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} {m.strength ? `(${m.strength})` : ""} {m.isPrescriptionRequired ? "[Rx]" : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500">{t.prescriptions.dosage}</label>
                            <Input
                              value={item.dosage}
                              onChange={(e) => {
                                const updated = [...intakeItems];
                                updated[index].dosage = e.target.value;
                                setIntakeItems(updated);
                              }}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">{t.prescriptions.frequency}</label>
                            <Input
                              value={item.frequency}
                              onChange={(e) => {
                                const updated = [...intakeItems];
                                updated[index].frequency = e.target.value;
                                setIntakeItems(updated);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">{t.prescriptions.duration}</label>
                            <Input
                              value={item.duration}
                              onChange={(e) => {
                                const updated = [...intakeItems];
                                updated[index].duration = e.target.value;
                                setIntakeItems(updated);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">{t.prescriptions.quantityRequired}</label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantityRequired}
                              onChange={(e) => {
                                const updated = [...intakeItems];
                                updated[index].quantityRequired = parseInt(e.target.value, 10) || 1;
                                setIntakeItems(updated);
                              }}
                              className="h-7 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500">{t.prescriptions.instructions}</label>
                          <Input
                            value={item.instructions}
                            onChange={(e) => {
                              const updated = [...intakeItems];
                              updated[index].instructions = e.target.value;
                              setIntakeItems(updated);
                            }}
                            placeholder={t.prescriptions.instructionsPlaceholder}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {t.prescriptions.notes}
                  </label>
                  <Input
                    value={intakeNotes}
                    onChange={(e) => setIntakeNotes(e.target.value)}
                    placeholder="Diagnosis or doctor remarks"
                    className="text-xs"
                  />
                </div>
              </CardContent>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowIntakeModal(false)}
                >
                  {t.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingIntake}
                  className="bg-[#0F766E] text-white hover:bg-[#115E59]"
                >
                  {isSubmittingIntake ? "Registering..." : "Submit Prescription"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
