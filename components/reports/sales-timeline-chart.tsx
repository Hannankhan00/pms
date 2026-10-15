"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useCurrency } from "@/lib/currency/context";

interface TimelineItem {
  date: string;
  revenue: number;
  salesCount: number;
  averageBasket: number;
}

interface SalesTimelineChartProps {
  data: TimelineItem[];
  height?: number;
}

export function SalesTimelineChart({ data, height = 320 }: SalesTimelineChartProps) {
  const { formatCurrency } = useCurrency();

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500"
        style={{ height }}
      >
        No sales transaction data recorded for this period.
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="clinicalRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F766E" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0F766E" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={{ stroke: "#E2E8F0" }}
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickFormatter={(val) => {
              const parts = val.split("-");
              return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#64748B", fontSize: 11 }}
            tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as TimelineItem;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <div className="mb-1 text-xs font-semibold text-slate-900">{label}</div>
                    <div className="space-y-1 font-mono text-xs">
                      <div className="flex items-center justify-between gap-4 text-[#0F766E]">
                        <span className="font-sans text-slate-600">Revenue:</span>
                        <span className="font-bold">{formatCurrency(item.revenue)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span className="font-sans">Invoices:</span>
                        <span>{item.salesCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-slate-600">
                        <span className="font-sans">Avg Basket:</span>
                        <span>{formatCurrency(item.averageBasket)}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#0F766E"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#clinicalRevenue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
