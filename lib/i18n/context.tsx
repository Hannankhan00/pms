"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Locale, DEFAULT_LOCALE, getLocaleDirection, isValidLocale } from "./config";
import { getDictionary } from "./index";
import type { Dictionary } from "./types";
import {
  CurrencyCode,
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  isValidCurrency,
  formatMoney,
} from "../currency/currency";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  dir: "ltr" | "rtl";
  isRtl: boolean;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatCurrency: (
    amount: number | string,
    options?: { convertFromUSD?: boolean }
  ) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  initialCurrency = DEFAULT_CURRENCY,
  children,
}: {
  initialLocale?: Locale;
  initialCurrency?: CurrencyCode;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
      if (match && isValidLocale(match[1])) {
        return match[1];
      }
    }
    return initialLocale;
  });

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )NEXT_CURRENCY=([^;]*)/);
      if (match && isValidCurrency(match[1])) {
        return match[1];
      }
    }
    return initialCurrency;
  });

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = newLocale;
    document.documentElement.dir = getLocaleDirection(newLocale);
  };

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    document.cookie = `NEXT_CURRENCY=${newCurrency}; path=/; max-age=31536000; SameSite=Lax`;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getLocaleDirection(locale);
  }, [locale]);

  const dir = getLocaleDirection(locale);
  const isRtl = dir === "rtl";
  const t = getDictionary(locale);

  const formatCurrency = (
    amount: number | string,
    options: { convertFromUSD?: boolean } = {}
  ) => {
    return formatMoney(amount, currency, {
      convertFromUSD: options.convertFromUSD,
      isRtl,
    });
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        dir,
        isRtl,
        currency,
        setCurrency,
        formatCurrency,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    const t = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t,
      dir: "ltr" as const,
      isRtl: false,
      currency: DEFAULT_CURRENCY,
      setCurrency: () => {},
      formatCurrency: (amount: number | string) =>
        formatMoney(amount, DEFAULT_CURRENCY),
    };
  }
  return context;
}
