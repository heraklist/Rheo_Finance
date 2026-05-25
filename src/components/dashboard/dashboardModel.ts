import type { BookTransactionCounts } from "@/lib/analytics";
import { MONTHS_SHORT_EL } from "@/lib/utils";

const MONTHS_GR = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

export const MONTHS_SHORT = MONTHS_SHORT_EL;

export type BookFilter = "all" | (string & {});

export type PeriodFilter =
  | { kind: "month"; year: number; month: number }
  | { kind: "today"; date: Date }
  | { kind: "week"; date: Date }
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { kind: "year"; year: number }
  | { kind: "custom"; fromDate: string; toDate: string }
  | { kind: "all" };

export interface DateRange {
  label: string;
  fromDate: string;
  toDate: string;
}

export interface DashboardBookOption {
  value: BookFilter;
  label: string;
  count: number;
}

export const EMPTY_BOOK_COUNTS: BookTransactionCounts = { all: 0, business: 0, personal: 0 };

export function bookLabel(bookId: string, books: Array<{ id: string; name: string }>): string {
  if (bookId === "all") return "Όλα τα βιβλία";
  return books.find((b) => b.id === bookId)?.name ?? bookId;
}

export function monthLabel(month: string): string {
  const monthNumber = Number(month.slice(5, 7));
  return MONTHS_SHORT[(monthNumber || 1) - 1] ?? month;
}

export function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function currentQuarter(date: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

export function periodToRange(period: PeriodFilter): DateRange {
  if (period.kind === "today") {
    const date = isoDate(period.date);
    return { label: "Σήμερα", fromDate: date, toDate: date };
  }

  if (period.kind === "week") {
    const weekday = (period.date.getDay() + 6) % 7;
    const start = new Date(period.date);
    start.setDate(period.date.getDate() - weekday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { label: "Αυτή η εβδομάδα", fromDate: isoDate(start), toDate: isoDate(end) };
  }

  if (period.kind === "quarter") {
    const startMonth = (period.quarter - 1) * 3;
    const start = new Date(period.year, startMonth, 1);
    const end = new Date(period.year, startMonth + 3, 0);
    return {
      label: `Q${period.quarter} ${period.year}`,
      fromDate: isoDate(start),
      toDate: isoDate(end),
    };
  }

  if (period.kind === "year") {
    return {
      label: `Έτος ${period.year}`,
      fromDate: `${period.year}-01-01`,
      toDate: `${period.year}-12-31`,
    };
  }

  if (period.kind === "custom") {
    return {
      label: "Προσαρμοσμένη",
      fromDate: period.fromDate,
      toDate: period.toDate,
    };
  }

  if (period.kind === "all") {
    return { label: "Όλη η περίοδος", fromDate: "1900-01-01", toDate: "9999-12-31" };
  }

  const start = new Date(period.year, period.month, 1);
  const end = new Date(period.year, period.month + 1, 0);
  return {
    label: `${MONTHS_GR[period.month]} ${period.year}`,
    fromDate: isoDate(start),
    toDate: isoDate(end),
  };
}
