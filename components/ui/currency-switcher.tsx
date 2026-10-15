"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import {
  CurrencyCode,
  SUPPORTED_CURRENCIES,
} from "@/lib/currency/currency";
import { Coins, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const CURRENCY_LIST: CurrencyCode[] = ["USD", "EUR", "PKR", "SAR"];

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentConfig = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.USD;

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Currency"
      >
        <Coins className="h-3.5 w-3.5 text-[#0F766E]" />
        <span className="font-semibold font-mono">{currentConfig.code}</span>
        <span className="text-slate-400 font-mono">({currentConfig.symbol})</span>
        <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-[8px] border border-[#E2E8F0] bg-white py-1 shadow-lg">
          {CURRENCY_LIST.map((code) => {
            const cfg = SUPPORTED_CURRENCIES[code];
            const isSelected = code === currency;

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setCurrency(code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-xs text-left transition-colors",
                  isSelected
                    ? "bg-teal-50 font-semibold text-[#0F766E]"
                    : "text-[#0F172A] hover:bg-[#F8FAFC]"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-800">{cfg.code}</span>
                  <span className="text-slate-500 font-mono text-[11px]">({cfg.symbol})</span>
                </div>
                <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                  {cfg.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
