import type { ExportBookScope, ExportPeriod } from "@/lib/export";
import type { PaymentMethod } from "@/lib/types";

export const APP_VERSION = "0.2.4";
export const CURRENT_YEAR = new Date().getFullYear();
export const VAT_RATES = [
  { label: "24%", value: 0.24 },
  { label: "13%", value: 0.13 },
  { label: "6%", value: 0.06 },
  { label: "0%", value: 0 },
];
export const PAYMENT_METHODS: PaymentMethod[] = [
  "Μετρητά",
  "Κάρτα",
  "Τραπεζική μεταφορά",
  "IRIS",
  "Άλλο",
];
export const BOOK_OPTIONS = [
  { label: "Επαγγελματικά", value: "book-business" },
  { label: "Προσωπικά", value: "book-personal" },
];
export const EXPORT_BOOK_OPTIONS: Array<{ label: string; value: ExportBookScope }> = [
  { label: "Επαγγελματικά", value: "business" },
  { label: "Προσωπικά", value: "personal" },
  { label: "Και τα δύο", value: "both" },
];

export type PeriodKey = "q1" | "q2" | "q3" | "q4" | "custom";

export function resolveExportPeriod(
  periodKey: PeriodKey,
  customFromDate: string,
  customToDate: string,
  quarterPeriods: ExportPeriod[],
): ExportPeriod {
  if (periodKey === "custom") {
    return {
      label: `${customFromDate}_${customToDate}`,
      fromDate: customFromDate,
      toDate: customToDate,
    };
  }

  const index = Number(periodKey.slice(1)) - 1;
  return (
    quarterPeriods[index] ?? {
      label: `${CURRENT_YEAR} Q1`,
      fromDate: `${CURRENT_YEAR}-01-01`,
      toDate: `${CURRENT_YEAR}-03-31`,
    }
  );
}
