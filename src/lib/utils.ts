import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format euro amount with Greek locale.
 * Examples: 1234.56 → "1.234,56 €" (full), or "1.235 €" (compact)
 */
export function formatEuro(amount: number, opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2,
  }).format(amount);
}

/**
 * Format ISO date as Greek "dd MMM" (e.g., "06 Μαΐ").
 */
const MONTHS_SHORT_EL = [
  "Ιαν",
  "Φεβ",
  "Μαρ",
  "Απρ",
  "Μαΐ",
  "Ιουν",
  "Ιουλ",
  "Αυγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
];

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS_SHORT_EL[d.getMonth()]}`;
}

/**
 * Returns "Σήμερα", "Χθες", or formatDateShort.
 */
export function formatDateRelative(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Σήμερα";
  if (diffDays === 1) return "Χθες";
  return formatDateShort(iso);
}

/**
 * Compute VAT amount and net from gross + rate.
 * gross = net * (1 + rate)
 * vat = gross * rate / (1 + rate)
 * net = gross - vat
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeVat(
  grossAmount: number,
  vatRate: number,
): {
  net: number;
  vat: number;
} {
  const gross = round2(grossAmount);

  if (vatRate === 0) {
    return { net: gross, vat: 0 };
  }

  const net = round2(gross / (1 + vatRate));
  const vat = round2(gross - net);
  return { net, vat };
}
