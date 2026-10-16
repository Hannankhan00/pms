"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  FileText,
  BadgeAlert,
  FileCheck,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
  Calendar,
  User,
  AlertTriangle,
  Building2,
  Stethoscope,
  Truck,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { JsonDiffDrawer } from "@/components/compliance/json-diff-drawer";
import { DateRangePicker } from "@/components/reports/date-range-picker";

type TabType = "audit" | "controlled" | "licenses";

export default function CompliancePage() {
  const { t } = useI18n();

  const [activeTab, setActiveTab] = useState<TabType>("audit");
  const [loading, setLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  // Controlled Substances State
  const [controlledLogs, setControlledLogs] = useState<any[]>([]);
  const [controlledTotal, setControlledTotal] = useState(0);

  // Licenses State
  const [licenses, setLicenses] = useState<any[]>([]);
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [newLicense, setNewLicense] = useState({
    licenseType: "OPERATING",
    licenseNumber: "",
    issueDate: "",
    expiryDate: "",
    documentUrl: "",
  });

  // Date Filters
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  });

  // 1. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(entityFilter ? { entity: entityFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {}),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: "50",
      });
      const res = await fetch(`/api/compliance/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setAuditLogs(json.data.items);
        setAuditTotal(json.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Controlled Substances
  const fetchControlledSubstances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: "50",
      });
      const res = await fetch(`/api/compliance/controlled-substances?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setControlledLogs(json.data.items);
        setControlledTotal(json.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch controlled substance records", err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch Licenses
  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/licenses");
      const json = await res.json();
      if (json.success) {
        setLicenses(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch licenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "audit") {
      fetchAuditLogs();
    } else if (activeTab === "controlled") {
      fetchControlledSubstances();
    } else if (activeTab === "licenses") {
      fetchLicenses();
    }
  }, [activeTab, dateRange, entityFilter, actionFilter]);

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/compliance/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLicense),
      });
      const json = await res.json();
      if (json.success) {
        setLicenseModalOpen(false);
        setNewLicense({
          licenseType: "OPERATING",
          licenseNumber: "",
          issueDate: "",
          expiryDate: "",
          documentUrl: "",
        });
        fetchLicenses();
      } else {
        alert(json.error?.message || "Failed to register license");
      }
    } catch (err) {
      console.error("Error creating license", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {t.compliance?.title ?? "Regulatory Compliance & Audit Trail"}
            </h1>
            <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[11px] font-semibold text-[#0F766E]">
              HIPAA / GDPR Ready
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {t.compliance?.subtitle ??
              "Immutable forensic event logging, controlled substance chain of custody, and regulatory permit surveillance."}
          </p>
        </div>

        {activeTab === "licenses" && (
          <button
            onClick={() => setLicenseModalOpen(true)}
            className="flex items-center gap-2 rounded-[8px] bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#115E59] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t.compliance?.licenses?.addLicense ?? "Register License"}</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("audit")}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === "audit"
              ? "text-[#0F766E] border-b-2 border-[#0F766E]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>{t.compliance?.audit?.tabTitle ?? "Forensic Audit Logs"}</span>
        </button>

        <button
          onClick={() => setActiveTab("controlled")}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === "controlled"
              ? "text-[#0F766E] border-b-2 border-[#0F766E]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <BadgeAlert className="h-4 w-4 text-amber-600" />
          <span>{t.compliance?.controlled?.tabTitle ?? "Controlled Substances Registry"}</span>
        </button>

        <button
          onClick={() => setActiveTab("licenses")}
          className={`pb-3 flex items-center gap-2 transition-colors relative ${
            activeTab === "licenses"
              ? "text-[#0F766E] border-b-2 border-[#0F766E]"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileCheck className="h-4 w-4 text-teal-600" />
          <span>{t.compliance?.licenses?.tabTitle ?? "Regulatory Permits & Licenses"}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AUDIT LOGS VIEWER */}
      {/* ========================================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-slate-200 bg-white p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onChange={setDateRange}
              />

              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="">All Entities</option>
                <option value="Medicine">Medicine Catalog</option>
                <option value="Sale">Sale / POS</option>
                <option value="Prescription">Prescription</option>
                <option value="Shift">Cashier Shift</option>
                <option value="PharmacyLicense">Pharmacy License</option>
                <option value="Expense">Expense</option>
              </select>

              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-[8px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="">All Actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="VERIFY">VERIFY</option>
                <option value="LOGIN">LOGIN</option>
              </select>
            </div>

            <button
              onClick={fetchAuditLogs}
              className="flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Table */}
          <div className="rounded-[10px] border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">User & Identity</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity Scope</th>
                    <th className="px-4 py-3">Entity Identifier</th>
                    <th className="px-4 py-3 text-right">Forensic Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-mono text-xs">
                        Loading immutable audit trail...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        No audit events recorded matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedLog(log);
                          setDiffOpen(true);
                        }}
                      >
                        <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{log.user?.name ?? "System"}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.user?.role?.name ?? "System Daemon"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                              log.action === "CREATE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : log.action === "UPDATE"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : log.action === "DELETE"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-teal-50 text-teal-700 border-teal-200"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{log.entity}</td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px] truncate max-w-[160px]">
                          {log.entityId}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                              setDiffOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-[6px] border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-[#0F766E] hover:text-[#0F766E] transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Diff</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CONTROLLED SUBSTANCES REGISTRY (FORMAL REGULATORY DOCUMENT) */}
      {/* ========================================================================= */}
      {activeTab === "controlled" && (
        <div className="space-y-4">
          {/* Regulatory Banner */}
          <div className="rounded-[8px] border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Official Controlled Substance Register (Title 21 CFR / Health Authority Compliant)</span>
              <p className="mt-0.5 text-amber-800">
                All records represent an immutable, unbroken chain of custody for narcotic and Schedule II-V pharmaceuticals.
                Inflows require verified Supplier Goods Receipt Notes; Outflows require a licensed Prescriber and verified Patient identity.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-[10px] border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Regulated Medication</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Batch / Lot</th>
                    <th className="px-4 py-3 text-right">Custody Quantity</th>
                    <th className="px-4 py-3">Chain of Custody (Party / Prescriber)</th>
                    <th className="px-4 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && controlledLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-mono text-xs">
                        Loading controlled substance ledger...
                      </td>
                    </tr>
                  ) : controlledLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        No controlled substance movements recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    controlledLogs.map((item) => {
                      const isOutflow = Number(item.quantity) < 0 || item.transactionType === "SALE";
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-700 whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-800">{item.medicine.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">{item.medicine.sku}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.5 font-semibold text-[10px] text-rose-700">
                              {item.medicine.regulatorySchedule || "Schedule II"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {item.batch.batchNumber}
                            <span className="block text-[10px] text-slate-400">
                              Exp: {new Date(item.batch.expiryDate).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span className={isOutflow ? "text-rose-600" : "text-emerald-600"}>
                              {isOutflow ? item.quantity : `+${item.quantity}`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.clinicalContext ? (
                              <div>
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Stethoscope className="h-3 w-3 text-indigo-600" />
                                  <span>{item.clinicalContext.doctor?.name ?? "Prescribing Physician"}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Patient: <span className="font-medium text-slate-700">{item.clinicalContext.patient?.name}</span>
                                  {item.clinicalContext.prescriptionNumber && ` (Rx: ${item.clinicalContext.prescriptionNumber})`}
                                </div>
                              </div>
                            ) : item.procurementContext ? (
                              <div>
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Truck className="h-3 w-3 text-[#0F766E]" />
                                  <span>{item.procurementContext.supplier?.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Invoice: {item.procurementContext.invoiceNumber}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Dispensary Stock Adjustment</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 font-medium">
                              {item.transactionType}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: REGULATORY LICENSES & PERMIT SURVEILLANCE */}
      {/* ========================================================================= */}
      {activeTab === "licenses" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[10px] border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Permits</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-slate-900">
                {licenses.filter((l) => l.status === "ACTIVE" && !l.isExpiringSoon).length}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700 font-medium">Valid operational certifications</p>
            </div>

            <div className="rounded-[10px] border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Expiring in &lt;60 Days</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-amber-900">
                {licenses.filter((l) => l.isExpiringSoon).length}
              </p>
              <p className="mt-1 text-[11px] text-amber-700 font-medium">Renewal documentation required</p>
            </div>

            <div className="rounded-[10px] border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Expired Permits</span>
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="mt-2 text-2xl font-bold font-mono text-rose-900">
                {licenses.filter((l) => l.status === "EXPIRED").length}
              </p>
              <p className="mt-1 text-[11px] text-rose-700 font-medium">Urgent compliance sanction</p>
            </div>
          </div>

          {/* Licenses List */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {licenses.map((lic) => {
              const isExpired = lic.status === "EXPIRED";
              const isWarning = lic.isExpiringSoon;

              return (
                <div
                  key={lic.id}
                  className={`rounded-[10px] border p-4 shadow-xs flex flex-col justify-between transition-all bg-white ${
                    isExpired
                      ? "border-rose-300 bg-rose-50/20"
                      : isWarning
                      ? "border-amber-300 bg-amber-50/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                        {lic.licenseType.replace("_", " ")}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          isExpired
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isWarning
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isExpired ? "EXPIRED" : isWarning ? `EXPIRING (${lic.daysRemaining}d)` : "ACTIVE"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 font-mono tracking-tight">{lic.licenseNumber}</h3>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Issued Date:</span>
                        <span className="font-mono">{new Date(lic.issueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Expiration:</span>
                        <span className={`font-mono font-semibold ${isExpired ? "text-rose-700" : isWarning ? "text-amber-700" : "text-slate-800"}`}>
                          {new Date(lic.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {isExpired
                        ? "Lapsed paperwork"
                        : `${lic.daysRemaining} days remaining`}
                    </span>
                    {lic.documentUrl && (
                      <a
                        href={lic.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#0F766E] hover:underline"
                      >
                        Inspect Certificate
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* JSON Diff Drawer */}
      <JsonDiffDrawer
        isOpen={diffOpen}
        onClose={() => setDiffOpen(false)}
        log={selectedLog}
      />

      {/* Register License Modal */}
      {licenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[12px] bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">Register Official Pharmacy Permit</h3>
            <p className="mt-1 text-xs text-slate-500">
              Submit regulatory credentials to maintain legal operational authorization.
            </p>

            <form onSubmit={handleCreateLicense} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Permit Classification</label>
                <select
                  value={newLicense.licenseType}
                  onChange={(e) => setNewLicense({ ...newLicense, licenseType: e.target.value })}
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                >
                  <option value="OPERATING">Operating Dispensary License</option>
                  <option value="NARCOTIC_DISPENSING">Controlled Narcotic Dispensing Permit</option>
                  <option value="TAX">Municipal & Tax Registration</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">License / Registration Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PHARM-REG-8921"
                  value={newLicense.licenseNumber}
                  onChange={(e) => setNewLicense({ ...newLicense, licenseNumber: e.target.value })}
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={newLicense.issueDate}
                    onChange={(e) => setNewLicense({ ...newLicense, issueDate: e.target.value })}
                    className="w-full rounded-[8px] border border-slate-300 p-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newLicense.expiryDate}
                    onChange={(e) => setNewLicense({ ...newLicense, expiryDate: e.target.value })}
                    className="w-full rounded-[8px] border border-slate-300 p-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document URL / Certificate Scan (Optional)</label>
                <input
                  type="url"
                  placeholder="https://cloud.storage/permit.pdf"
                  value={newLicense.documentUrl}
                  onChange={(e) => setNewLicense({ ...newLicense, documentUrl: e.target.value })}
                  className="w-full rounded-[8px] border border-slate-300 p-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLicenseModalOpen(false)}
                  className="rounded-[8px] border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-[8px] bg-[#0F766E] px-4 py-1.5 font-semibold text-white hover:bg-[#115E59] transition-colors"
                >
                  Save Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
