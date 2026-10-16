"use client";

import React from "react";
import { X, ArrowRight, ShieldCheck, User, Calendar, Database } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface JsonDiffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  log: {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    createdAt: string;
    ipAddress?: string | null;
    user?: {
      name: string;
      email: string;
      role?: { name: string };
    } | null;
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
  } | null;
}

export function JsonDiffDrawer({ isOpen, onClose, log }: JsonDiffDrawerProps) {
  const { t, isRtl } = useI18n();

  if (!isOpen || !log) return null;

  const oldObj = (log.oldValues || {}) as Record<string, unknown>;
  const newObj = (log.newValues || {}) as Record<string, unknown>;

  const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).sort();

  const formatVal = (val: unknown): string => {
    if (val === null || val === undefined) return "null";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "VERIFY":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-teal-100 text-[#0F766E]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    {t.compliance?.audit?.diffTitle ?? "Forensic Audit Inspection"}
                  </h2>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${getActionBadgeClass(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  {log.entity} : {log.entityId}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 border-b border-slate-100 bg-slate-50/40 p-4 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-800">{log.user?.name ?? "System / Automated"}</span>
                <span className="block text-[11px] text-slate-400">{log.user?.email ?? "system@pharmacy.local"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <span className="font-mono text-slate-800">
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}
                </span>
                {log.ipAddress && (
                  <span className="block text-[11px] text-slate-400 font-mono">IP: {log.ipAddress}</span>
                )}
              </div>
            </div>
          </div>

          {/* Visual Diff Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t.compliance?.audit?.stateChanges ?? "Field Level Mutation Analysis"}
              </span>
              <span className="text-[11px] text-slate-400">
                {allKeys.length} {allKeys.length === 1 ? "field tracked" : "fields tracked"}
              </span>
            </div>

            {allKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                No JSON payload attributes recorded for this event.
              </div>
            ) : (
              <div className="space-y-3">
                {allKeys.map((key) => {
                  const hasOld = key in oldObj;
                  const hasNew = key in newObj;
                  const oldV = oldObj[key];
                  const newV = newObj[key];
                  const isModified = hasOld && hasNew && JSON.stringify(oldV) !== JSON.stringify(newV);
                  const isAdded = !hasOld && hasNew;
                  const isDeleted = hasOld && !hasNew;
                  const isUnchanged = hasOld && hasNew && JSON.stringify(oldV) === JSON.stringify(newV);

                  if (isUnchanged) {
                    return (
                      <div
                        key={key}
                        className="rounded-[8px] border border-slate-100 bg-slate-50/50 p-2.5 text-xs text-slate-500 flex justify-between items-center"
                      >
                        <span className="font-mono font-medium text-slate-600">{key}</span>
                        <span className="font-mono text-slate-400 truncate max-w-[320px]">{formatVal(newV)}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={key}
                      className={`rounded-[8px] border p-3 text-xs transition-colors ${
                        isModified
                          ? "border-amber-200 bg-amber-50/40"
                          : isAdded
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-rose-200 bg-rose-50/40"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-slate-800">{key}</span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            isModified
                              ? "bg-amber-100 text-amber-800"
                              : isAdded
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {isModified ? "Modified" : isAdded ? "Added" : "Deleted"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 items-center font-mono text-[11px]">
                        {/* Old Value */}
                        <div className="rounded bg-white p-2 border border-slate-200/80 overflow-x-auto">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            Before
                          </span>
                          <span className={hasOld ? "text-rose-700" : "text-slate-400 italic"}>
                            {hasOld ? formatVal(oldV) : "undefined"}
                          </span>
                        </div>

                        {/* New Value */}
                        <div className="rounded bg-white p-2 border border-slate-200/80 overflow-x-auto">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                            After
                          </span>
                          <span className={hasNew ? "text-emerald-700 font-semibold" : "text-slate-400 italic"}>
                            {hasNew ? formatVal(newV) : "undefined"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Audit ID: <span className="font-mono text-[11px] text-slate-700">{log.id}</span></span>
            <button
              onClick={onClose}
              className="rounded-[6px] border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
