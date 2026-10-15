import { Locale, DEFAULT_LOCALE, isValidLocale } from "./config";
import type { Dictionary } from "./types";
import en from "./dictionaries/en.json";
import ar from "./dictionaries/ar.json";
import it from "./dictionaries/it.json";
import fr from "./dictionaries/fr.json";

const dictionaries: Record<Locale, Dictionary> = {
  en,
  ar,
  it,
  fr,
};

export function getDictionary(locale?: string): Dictionary {
  if (locale && isValidLocale(locale)) {
    return dictionaries[locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

export * from "./config";
export * from "./types";
