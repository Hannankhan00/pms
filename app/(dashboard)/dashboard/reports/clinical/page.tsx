"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Stethoscope,
  Users,
  Pill,
  Download,
  RefreshCw,
  TrendingUp,
  Percent,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useCurrency } from "@/lib/currency/context";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { exportToCsv } from "@/lib/utils/export";

export default function ClinicalReportsPage() {
  const { t } = useI18n();
  const { formatCurrency } = useCurrency();

  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchClinicalReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/clinical?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch clinical reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicalReport();
  }, [dateRange]);

  const handleExport = () => {
    if (!data?.topDoctors) return;
    exportToCsv("top_prescribing_doctors", data.topDoctors, [
      { key: "doctorName", label: "Doctor Name" },
      { key: "specialization", label: "Specialization" },
      { key: "hospitalAffiliation", label: "Hospital / Clinic" },
      { key: "licenseNumber", label: "License Number" },
      { key: "prescriptionCount", label: "Prescriptions Written" },
      { key: "dispensedCount", label: "Prescriptions Dispensed" },
      { key: "patientCount", label: "Distinct Patients" },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {t.reports?.clinical?.title ?? "Clinical & Dispensing Analytics"}
          </h1>
          <p className="text-xs text-slate-500">
            {t.reports?.clinical?.subtitle ?? "Prescription verification rates, regulated Rx versus OTC sales distribution, and prescriber partnerships."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={setDateRange}
          />
          <button
            onClick={fetchClinicalReport}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>{t.common?.refresh ?? "Refresh"}</span>
          </button>
          <button
            onClick={handleExport}
            disabled={!data || data.topDoctors?.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#115E59] focus:outline-none disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{t.reports?.export ?? "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Prescriptions Inward</span>
            <div className="rounded-lg bg-teal-50 p-2 text-[#0F766E]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {data?.summary?.totalPrescriptions || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total patient prescriptions registered</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Fully Dispensed</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-emerald-700">
            {data?.summary?.dispensedPrescriptions || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Dispensing rate: {Number(data?.summary?.dispensingRate || 0).toFixed(1)}%
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Clinical Verification Rate</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {Number(data?.summary?.verificationRate || 0).toFixed(1)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {data?.summary?.verifiedPrescriptions || 0} verified by licensed pharmacist
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Prescribing Doctors</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tracking-tight text-slate-900">
            {data?.topDoctors?.length || 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Active medical partners</div>
        </div>
      </div>

      {/* Rx vs OTC Volume Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Prescription Regulated (Rx) */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#0F766E]">Regulated Prescription Sales (Rx)</h2>
              <p className="text-xs text-slate-500">Dispensed under licensed pharmacist verification</p>
            </div>
            <Pill className="h-5 w-5 text-[#0F766E]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500">Rx Revenue</span>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                {formatCurrency(data?.rxVsOtc?.rx?.revenue || 0)}
              </div>
              <div className="font-mono text-xs font-semibold text-[#0F766E]">
                {Number(data?.rxVsOtc?.rxPercentage || 0).toFixed(1)}% of total volume
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500">Rx Units Dispensed</span>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                {data?.rxVsOtc?.rx?.units || 0}
              </div>
              <div className="text-xs text-slate-500">Across {data?.rxVsOtc?.rx?.items || 0} line items</div>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[#0F766E]"
              style={{ width: `${Math.min(100, Number(data?.rxVsOtc?.rxPercentage || 0))}%` }}
            />
          </div>
        </div>

        {/* Over-The-Counter (OTC) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Over-The-Counter Sales (OTC)</h2>
              <p className="text-xs text-slate-500">General wellness, vitamins, and non-scheduled medications</p>
            </div>
            <Users className="h-5 w-5 text-slate-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500">OTC Revenue</span>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                {formatCurrency(data?.rxVsOtc?.otc?.revenue || 0)}
              </div>
              <div className="font-mono text-xs font-semibold text-slate-600">
                {Number(data?.rxVsOtc?.otcPercentage || 0).toFixed(1)}% of total volume
              </div>
            </div>
            <div>
              <span className="text-xs text-slate-500">OTC Units Sold</span>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                {data?.rxVsOtc?.otc?.units || 0}
              </div>
              <div className="text-xs text-slate-500">Across {data?.rxVsOtc?.otc?.items || 0} line items</div>
            </div>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-500"
              style={{ width: `${Math.min(100, Number(data?.rxVsOtc?.otcPercentage || 0))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Prescribing Doctors Leaderboard */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Top Prescribing Doctors Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="p-3 font-semibold">Doctor Name</th>
                <th className="p-3 font-semibold">Specialization</th>
                <th className="p-3 font-semibold">Hospital / Affiliation</th>
                <th className="p-3 font-semibold">License #</th>
                <th className="p-3 text-right font-semibold">Rx Written</th>
                <th className="p-3 text-right font-semibold">Rx Dispensed</th>
                <th className="p-3 text-right font-semibold">Patients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data?.topDoctors?.map((d: any) => (
                <tr key={d.doctorId} className="hover:bg-slate-50/60">
                  <td className="p-3 font-sans font-semibold text-slate-900">{d.doctorName}</td>
                  <td className="p-3 font-sans text-slate-600">{d.specialization}</td>
                  <td className="p-3 font-sans text-slate-500">{d.hospitalAffiliation}</td>
                  <td className="p-3 text-slate-600">{d.licenseNumber}</td>
                  <td className="p-3 text-right font-bold text-[#0F766E]">{d.prescriptionCount}</td>
                  <td className="p-3 text-right text-emerald-700">{d.dispensedCount}</td>
                  <td className="p-3 text-right text-slate-800">{d.patientCount}</td>
                </tr>
              ))}
              {(!data?.topDoctors || data.topDoctors.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                    No doctor prescriptions recorded for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
