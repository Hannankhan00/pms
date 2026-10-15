"use client";

import { useI18n } from "@/lib/i18n/context";

export function useCurrency() {
  const { currency, setCurrency, formatCurrency } = useI18n();
  return {
    currency,
    setCurrency,
    formatCurrency,
  };
}
