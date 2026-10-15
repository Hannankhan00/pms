export type Locale = "en" | "ar" | "it" | "fr";

export interface LocaleMetadata {
  code: Locale;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALES: Record<Locale, LocaleMetadata> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    dir: "ltr",
  },
  ar: {
    code: "ar",
    name: "Arabic",
    nativeName: "العربية",
    dir: "rtl",
  },
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    dir: "ltr",
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    dir: "ltr",
  },
};

export const SUPPORTED_LOCALES: Locale[] = ["en", "ar", "it", "fr"];

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

export function getLocaleDirection(locale: Locale): "ltr" | "rtl" {
  return LOCALES[locale]?.dir || "ltr";
}

export function isRtl(locale: Locale): boolean {
  return getLocaleDirection(locale) === "rtl";
}
