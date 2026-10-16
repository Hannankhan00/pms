"use client";

import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  AlertTriangle,
  ArrowRight,
  Database,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface ImportJob {
  id: string;
  entity: "MEDICINE" | "SUPPLIER" | "CUSTOMER";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalRows: number;
  successRows: number;
  failedRows: number;
  errorLog?: { row: number; identifier?: string; error: string }[] | null;
  createdAt: string;
}

export default function MigrationPage() {
  const { t } = useI18n();
  const [selectedEntity, setSelectedEntity] = useState<"MEDICINE" | "SUPPLIER" | "CUSTOMER">("MEDICINE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/imports/jobs");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setHistory(json.data);
        }
      }
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Please select a valid .csv file.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".csv")) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Please select a valid .csv file.");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);
    setActiveJob(null);

    try {
      const formData = new FormData();
      formData.append("entity", selectedEntity);
      formData.append("file", selectedFile);

      const res = await fetch("/api/imports/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to process bulk import.");
      }

      setActiveJob(json.data);
      setSelectedFile(null);
      fetchHistory();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = (entity: string) => {
    window.location.href = `/api/imports/template?entity=${entity}`;
  };

  const exportData = (entity: string) => {
    window.location.href = `/api/export?entity=${entity}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t.migration?.title ?? "Data Migration & Bulk Import Engine"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.migration?.subtitle ??
              "Idempotent bulk onboarding and standardized data extraction across catalog, suppliers, and customer entities."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportData("medicines")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-teal-700" />
            <span>Export Catalog</span>
          </button>
          <button
            onClick={() => exportData("inventory")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-teal-700" />
            <span>Export Inventory</span>
          </button>
        </div>
      </div>

      {/* Main Migration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Entity Selector & Upload Zone */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entity Tabs */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              1. Select Target Entity
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "MEDICINE", title: "Medicines & Catalog", subtitle: "Upsert by SKU" },
                { key: "SUPPLIER", title: "Pharmaceutical Suppliers", subtitle: "Upsert by Name" },
                { key: "CUSTOMER", title: "Patients & Customers", subtitle: "Upsert by Phone" },
              ].map((ent) => (
                <button
                  key={ent.key}
                  type="button"
                  onClick={() => {
                    setSelectedEntity(ent.key as any);
                    setSelectedFile(null);
                    setErrorMessage(null);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedEntity === ent.key
                      ? "border-teal-700 bg-teal-50/50 shadow-sm ring-1 ring-teal-700"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{ent.title}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-1">{ent.subtitle}</p>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Need the official format specification?
              </span>
              <button
                onClick={() => downloadTemplate(selectedEntity)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download {selectedEntity} CSV Template</span>
              </button>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
              2. Upload Migration File
            </h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                selectedFile
                  ? "border-teal-600 bg-teal-50/30"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
              }`}
            >
              <UploadCloud className="h-10 w-10 mx-auto text-slate-400 mb-3" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs font-mono text-slate-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="mt-3 text-xs text-rose-600 hover:underline"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Drag and drop your CSV file here, or{" "}
                    <label className="text-teal-700 font-semibold cursor-pointer hover:underline">
                      browse
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Standard RFC 4180 CSV, UTF-8 encoded
                  </p>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Idempotent Migration...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span>Execute Idempotent Import</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Col: Active Job Result or Architecture Instructions */}
        <div className="space-y-6">
          {activeJob ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Import Summary
                </span>
                <span
                  className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    activeJob.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {activeJob.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase">Total</p>
                  <p className="text-lg font-bold text-slate-900">{activeJob.totalRows}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-[10px] text-emerald-700 uppercase">Success</p>
                  <p className="text-lg font-bold text-emerald-800">{activeJob.successRows}</p>
                </div>
                <div className="p-3 bg-rose-50 rounded-lg">
                  <p className="text-[10px] text-rose-700 uppercase">Failed</p>
                  <p className="text-lg font-bold text-rose-800">{activeJob.failedRows}</p>
                </div>
              </div>

              {activeJob.errorLog && activeJob.errorLog.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-rose-800">
                    Row-Level Discrepancies ({activeJob.errorLog.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                    {activeJob.errorLog.map((err, i) => (
                      <div key={i} className="p-2 rounded bg-rose-50/80 border border-rose-100 text-rose-800">
                        <span className="font-bold">Row {err.row}:</span> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-teal-700" />
                <span>Idempotent Ingestion Principles</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <p className="font-semibold text-slate-800">Zero Duplicates Guarantee</p>
                  <p>
                    Re-uploading existing files safely updates existing records matching on SKU or phone
                    without throwing constraint violations.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                  <p className="font-semibold text-slate-800">Automatic Catalog Categorization</p>
                  <p>
                    New categories referenced in the CSV are dynamically provisioned under your pharmacy tenant.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Migration History Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-800">
            Migration Execution History
          </h2>
          <button
            onClick={fetchHistory}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-100/50 text-[11px] font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Entity</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 font-mono">Total Rows</th>
                <th className="px-6 py-3 font-mono">Success</th>
                <th className="px-6 py-3 font-mono">Failed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No migration jobs logged.
                  </td>
                </tr>
              ) : (
                history.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-mono text-slate-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{job.entity}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                          job.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : job.status === "PROCESSING"
                            ? "bg-teal-100 text-teal-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-mono">{job.totalRows}</td>
                    <td className="px-6 py-3 font-mono text-emerald-700 font-semibold">
                      {job.successRows}
                    </td>
                    <td className="px-6 py-3 font-mono text-rose-700 font-semibold">
                      {job.failedRows}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
