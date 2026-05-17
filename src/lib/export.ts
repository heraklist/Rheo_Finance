import { downloadDir, join } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

import { getDb } from "@/lib/db";
import type { CategoryType } from "@/lib/types";
import { round2 } from "@/lib/utils";
import { type WorkbookSheet, createXlsxWorkbook } from "@/lib/xlsx";

export type ExportBookScope = "business" | "personal" | "both";

export interface ExportPeriod {
  label: string;
  fromDate: string;
  toDate: string;
}

export interface FinanceExportOptions {
  period: ExportPeriod;
  bookScope: ExportBookScope;
}

export interface FinanceExportResult {
  path: string;
  transactionCount: number;
}

interface ExportTransactionRow {
  date: string;
  description: string;
  payment_method: string;
  amount_gross: number;
  vat_rate: number;
  amount_vat: number;
  amount_net: number;
  receipt_photo_path: string | null;
  recurring_template_id: string | null;
  notes: string | null;
  book_name: string | null;
  account_name: string | null;
  category_name: string | null;
  category_type: CategoryType | null;
  tag_name: string | null;
}

interface VatBucket {
  label: string;
  fromDate: string;
  toDate: string;
  output: number;
  input: number;
  net: number;
  count: number;
}

const BOOK_IDS: Record<Exclude<ExportBookScope, "both">, string> = {
  business: "book-business",
  personal: "book-personal",
};

const MONTHS_SHORT = [
  "Ιαν",
  "Φεβ",
  "Μαρ",
  "Απρ",
  "Μάι",
  "Ιουν",
  "Ιουλ",
  "Αυγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
];

function bookIdForScope(scope: ExportBookScope): string | undefined {
  return scope === "both" ? undefined : BOOK_IDS[scope];
}

function typeLabel(type: CategoryType | null): string {
  if (type === "income") return "Έσοδο";
  if (type === "expense") return "Έξοδο";
  if (type === "reserve") return "Αποθεματικό";
  if (type === "transfer") return "Μεταφορά";
  return "";
}

function localDate(iso: string): Date {
  const [year = 1970, month = 1, day = 1] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`;
}

function monthKeysBetween(fromDate: string, toDate: string): string[] {
  const start = localDate(fromDate);
  const end = localDate(toDate);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const keys: string[] = [];

  while (cursor <= last) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return keys;
}

function quarterPeriod(year: number, quarter: 1 | 2 | 3 | 4): ExportPeriod {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return {
    label: `${year} Q${quarter}`,
    fromDate: isoDate(start),
    toDate: isoDate(end),
  };
}

export function currentQuarterPeriods(year = new Date().getFullYear()): ExportPeriod[] {
  return [1, 2, 3, 4].map((quarter) => quarterPeriod(year, quarter as 1 | 2 | 3 | 4));
}

async function loadExportRows(options: FinanceExportOptions): Promise<ExportTransactionRow[]> {
  const db = await getDb();
  const conditions = ["t.date >= ?", "t.date <= ?"];
  const params: Array<string | number> = [options.period.fromDate, options.period.toDate];
  const bookId = bookIdForScope(options.bookScope);

  if (bookId) {
    conditions.push("t.book_id = ?");
    params.push(bookId);
  }

  return db.select<ExportTransactionRow[]>(
    `SELECT t.date,
            t.description,
            t.payment_method,
            t.amount_gross,
            t.vat_rate,
            t.amount_vat,
            t.amount_net,
            t.receipt_photo_path,
            t.recurring_template_id,
            t.notes,
            b.name AS book_name,
            a.name AS account_name,
            c.name AS category_name,
            c.type AS category_type,
            tg.name AS tag_name
     FROM transactions t
     LEFT JOIN books b ON b.id = t.book_id
     LEFT JOIN accounts a ON a.id = t.account_id
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN tags tg ON tg.id = t.tag_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY t.date ASC, t.created_at ASC`,
    params,
  );
}

function transactionsSheet(rows: ExportTransactionRow[]): WorkbookSheet {
  return {
    name: "Transactions",
    rows: [
      [
        "Ημερομηνία",
        "Book",
        "Λογαριασμός",
        "Κατηγορία",
        "Τύπος",
        "Tag",
        "Περιγραφή",
        "Πληρωμή",
        "Μικτό",
        "ΦΠΑ %",
        "ΦΠΑ",
        "Καθαρό",
        "Απόδειξη",
        "Πάγιο",
        "Σημειώσεις",
      ],
      ...rows.map((row) => [
        row.date,
        row.book_name ?? "",
        row.account_name ?? "",
        row.category_name ?? "",
        typeLabel(row.category_type),
        row.tag_name ?? "",
        row.description,
        row.payment_method,
        round2(row.amount_gross),
        round2(row.vat_rate * 100),
        round2(row.amount_vat),
        round2(row.amount_net),
        row.receipt_photo_path ? "Ναι" : "Όχι",
        row.recurring_template_id ? "Ναι" : "Όχι",
        row.notes ?? "",
      ]),
    ],
  };
}

function vatSummarySheet(rows: ExportTransactionRow[]): WorkbookSheet {
  const buckets = new Map<string, VatBucket>();

  for (const row of rows) {
    const date = localDate(row.date);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const start = new Date(date.getFullYear(), (quarter - 1) * 3, 1);
    const end = new Date(date.getFullYear(), quarter * 3, 0);
    const key = `${date.getFullYear()}-Q${quarter}`;
    const bucket =
      buckets.get(key) ??
      ({
        label: key,
        fromDate: isoDate(start),
        toDate: isoDate(end),
        output: 0,
        input: 0,
        net: 0,
        count: 0,
      } satisfies VatBucket);

    if (row.category_type === "income") bucket.output = round2(bucket.output + row.amount_vat);
    if (row.category_type === "expense") bucket.input = round2(bucket.input + row.amount_vat);
    bucket.net = round2(bucket.output - bucket.input);
    bucket.count++;
    buckets.set(key, bucket);
  }

  return {
    name: "VAT Summary",
    rows: [
      ["Περίοδος", "Από", "Έως", "Output ΦΠΑ", "Input ΦΠΑ", "Καθαρό ΦΠΑ", "Συναλλαγές"],
      ...Array.from(buckets.values()).map((bucket) => [
        bucket.label,
        bucket.fromDate,
        bucket.toDate,
        bucket.output,
        bucket.input,
        bucket.net,
        bucket.count,
      ]),
    ],
  };
}

function categoriesBreakdownSheet(
  rows: ExportTransactionRow[],
  period: ExportPeriod,
): WorkbookSheet {
  const months = monthKeysBetween(period.fromDate, period.toDate);
  const buckets = new Map<
    string,
    { label: string; type: string; book: string; values: Map<string, number> }
  >();

  for (const row of rows) {
    const key = `${row.book_name ?? ""}|${row.category_name ?? ""}|${row.category_type ?? ""}`;
    const bucket =
      buckets.get(key) ??
      ({
        label: row.category_name ?? "",
        type: typeLabel(row.category_type),
        book: row.book_name ?? "",
        values: new Map<string, number>(),
      } satisfies { label: string; type: string; book: string; values: Map<string, number> });
    const month = row.date.slice(0, 7);
    const current = bucket.values.get(month) ?? 0;
    bucket.values.set(month, round2(current + row.amount_gross));
    buckets.set(key, bucket);
  }

  return {
    name: "Categories Breakdown",
    rows: [
      ["Book", "Κατηγορία", "Τύπος", ...months.map(monthLabel), "Σύνολο"],
      ...Array.from(buckets.values()).map((bucket) => {
        const values = months.map((month) => bucket.values.get(month) ?? 0);
        const total = round2(values.reduce((sum, value) => sum + value, 0));
        return [bucket.book, bucket.label, bucket.type, ...values, total];
      }),
    ],
  };
}

function buildWorkbook(rows: ExportTransactionRow[], options: FinanceExportOptions): Uint8Array {
  return createXlsxWorkbook([
    transactionsSheet(rows),
    vatSummarySheet(rows),
    categoriesBreakdownSheet(rows, options.period),
  ]);
}

function safeFilePart(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function saveFinanceExport(
  options: FinanceExportOptions,
): Promise<FinanceExportResult | null> {
  const rows = await loadExportRows(options);
  const workbook = buildWorkbook(rows, options);
  const fileName = `rheo-${options.bookScope}-${safeFilePart(options.period.label)}.xlsx`;
  const defaultPath = await join(await downloadDir(), fileName);
  const path = await save({
    defaultPath,
    filters: [{ name: "Excel workbook", extensions: ["xlsx"] }],
  });

  if (!path) return null;

  await writeFile(path, workbook);
  return {
    path,
    transactionCount: rows.length,
  };
}
