export type CurrencyCode = "USD" | "EUR" | "PKR" | "SAR";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  nativeName: string;
  symbolPosition: "prefix" | "suffix";
  exchangeRateToUSD: number; // 1 USD = X Currency
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    nativeName: "US Dollar",
    symbolPosition: "prefix",
    exchangeRateToUSD: 1.0,
    decimals: 2,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro (France / EU)",
    nativeName: "Euro",
    symbolPosition: "prefix",
    exchangeRateToUSD: 0.92,
    decimals: 2,
  },
  PKR: {
    code: "PKR",
    symbol: "Rs.",
    name: "Pakistani Rupee",
    nativeName: "روپیہ",
    symbolPosition: "prefix",
    exchangeRateToUSD: 278.5,
    decimals: 2,
  },
  SAR: {
    code: "SAR",
    symbol: "SAR",
    name: "Saudi Riyal",
    nativeName: "ر.س",
    symbolPosition: "suffix",
    exchangeRateToUSD: 3.75,
    decimals: 2,
  },
};

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export function isValidCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES;
}

/**
 * Formats a monetary amount into a localized currency string.
 * Optionally applies currency conversion if convertFromUSD is set.
 */
export function formatMoney(
  amount: number | string,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
  options: {
    convertFromUSD?: boolean;
    isRtl?: boolean;
  } = {}
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) || 0 : amount;
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;

  const value = options.convertFromUSD
    ? numericAmount * config.exchangeRateToUSD
    : numericAmount;

  const formattedNumber = value.toLocaleString(undefined, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  });

  const displaySymbol = options.isRtl && config.nativeName ? config.nativeName : config.symbol;

  if (config.symbolPosition === "prefix") {
    return `${displaySymbol} ${formattedNumber}`;
  } else {
    return `${formattedNumber} ${displaySymbol}`;
  }
}
