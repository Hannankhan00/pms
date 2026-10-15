"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/context";
import { LOCALES, SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
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

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 items-center gap-2 rounded-[8px] border border-[#E2E8F0] bg-white px-3 text-xs font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] hover:border-[#CBD5E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Language"
      >
        <Globe className="h-3.5 w-3.5 text-[#0F766E]" />
        <span className="font-semibold">{LOCALES[locale].nativeName}</span>
        <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-36 origin-top-right rounded-[8px] border border-[#E2E8F0] bg-white py-1 elevation-2">
          {SUPPORTED_LOCALES.map((code) => {
            const loc = LOCALES[code];
            const isSelected = code === locale;

            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setLocale(code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-xs text-left transition-colors",
                  isSelected
                    ? "bg-[#DCFCE7] font-semibold text-[#16A34A]"
                    : "text-[#0F172A] hover:bg-[#F8FAFC]"
                )}
              >
                <span>{loc.nativeName}</span>
                <span className="font-mono text-[10px] uppercase text-[#94A3B8]">{code}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
