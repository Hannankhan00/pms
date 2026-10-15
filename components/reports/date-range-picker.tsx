"use client";

import React from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  className?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className = "",
}: DateRangePickerProps) {
  const { t } = useI18n();

  const presets = [
    {
      label: t.reports?.presets?.today ?? "Today",
      getRange: () => {
        const today = new Date().toISOString().split("T")[0];
        return { startDate: today, endDate: today };
      },
    },
    {
      label: t.reports?.presets?.last7Days ?? "Last 7 Days",
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: t.reports?.presets?.last30Days ?? "Last 30 Days",
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      },
    },
    {
      label: t.reports?.presets?.thisMonth ?? "This Month",
      getRange: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
        };
      },
    },
    {
      label: t.reports?.presets?.last90Days ?? "Last 90 Days",
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 90);
        return {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
        };
      },
    },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Presets */}
      <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange(preset.getRange())}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
        <Calendar className="h-4 w-4 text-slate-400" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onChange({ startDate: e.target.value, endDate })}
          className="bg-transparent font-mono text-xs text-slate-800 focus:outline-none"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onChange({ startDate, endDate: e.target.value })}
          className="bg-transparent font-mono text-xs text-slate-800 focus:outline-none"
        />
      </div>
    </div>
  );
}
