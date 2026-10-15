import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { I18nProvider } from "@/lib/i18n/context";
import { DEFAULT_LOCALE, Locale, getLocaleDirection, isValidLocale } from "@/lib/i18n/config";
import { DEFAULT_CURRENCY, isValidCurrency, CurrencyCode } from "@/lib/currency/currency";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PharmSpoke — Clinical Precision Pharmacy Management System",
  description: "Enterprise Multi-Tenant Pharmacy Management System (PMS) Spoke Application.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const currencyCookie = cookieStore.get("NEXT_CURRENCY")?.value;

  const initialLocale: Locale =
    localeCookie && isValidLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;
  const initialCurrency: CurrencyCode =
    currencyCookie && isValidCurrency(currencyCookie) ? currencyCookie : DEFAULT_CURRENCY;
  const dir = getLocaleDirection(initialLocale);

  return (
    <html lang={initialLocale} dir={dir} className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#F8FAFC] text-[#475569] antialiased">
        <I18nProvider initialLocale={initialLocale} initialCurrency={initialCurrency}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}


