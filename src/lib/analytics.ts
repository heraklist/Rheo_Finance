import { getDb } from "@/lib/db";
import { computeNextDue, listRecurringTemplates } from "@/lib/recurring";
import type { CategoryType, RecurringTemplateWithRelations } from "@/lib/types";

export interface VatQuarter {
  quarter: 1 | 2 | 3 | 4;
  label: string;
  fromDate: string;
  toDate: string;
  output: number;
  input: number;
  net: number;
  transactionCount: number;
}

export interface ForecastMonth {
  month: string;
  label: string;
  fromDate: string;
  toDate: string;
  recurringIncome: number;
  recurringExpense: number;
  averageIncome: number;
  averageExpense: number;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export interface ForecastResult {
  months: ForecastMonth[];
  openingBalance: number;
  recurringCount: number;
  basePeriodMonths: number;
  historyMonthsWithData: number;
}

export interface MonthlyTotals {
  month: string;
  income: number;
  expense: number;
}

export interface BookTransactionCounts {
  all: number;
  business: number;
  personal: number;
}

interface TransactionAnalyticsRow {
  date: string;
  amount_gross: number;
  amount_vat: number;
  recurring_template_id: string | null;
  category_type: CategoryType | null;
}

interface MonthlyAverage {
  income: number;
  expense: number;
  monthsWithData: number;
}

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

const QUARTER_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: "Q1 Ιαν-Μαρ",
  2: "Q2 Απρ-Ιουν",
  3: "Q3 Ιουλ-Σεπ",
  4: "Q4 Οκτ-Δεκ",
};

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDate(iso: string): Date {
  const parts = iso.slice(0, 10).split("-").map(Number);
  return new Date(parts[0] ?? 1970, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function lastDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function signedGross(row: TransactionAnalyticsRow): number {
  if (row.category_type === "income") return row.amount_gross;
  if (row.category_type === "expense") return -row.amount_gross;
  return 0;
}

function applyForecastAmount(
  bucket: Pick<ForecastMonth, "recurringIncome" | "recurringExpense">,
  categoryType: CategoryType | undefined,
  amount: number,
) {
  if (categoryType === "income") {
    bucket.recurringIncome += amount;
  } else if (categoryType === "expense") {
    bucket.recurringExpense += amount;
  }
}

function nextDueAfter(template: RecurringTemplateWithRelations, date: string): string | null {
  return computeNextDue({
    active: template.active,
    frequency: template.frequency,
    day_of_period: template.day_of_period,
    start_date: template.start_date,
    end_date: template.end_date,
    last_generated: date,
  });
}

export async function getVatByQuarter(year: number, bookId?: string): Promise<VatQuarter[]> {
  const db = await getDb();
  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;
  const conditions = ["t.date >= ?", "t.date <= ?"];
  const params: Array<string | number> = [fromDate, toDate];

  if (bookId) {
    conditions.push("t.book_id = ?");
    params.push(bookId);
  }

  const rows = await db.select<TransactionAnalyticsRow[]>(
    `SELECT t.date,
            t.amount_gross,
            t.amount_vat,
            t.recurring_template_id,
            c.type AS category_type
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );

  const quarters: VatQuarter[] = [1, 2, 3, 4].map((quarter) => {
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    return {
      quarter: quarter as 1 | 2 | 3 | 4,
      label: QUARTER_LABELS[quarter as 1 | 2 | 3 | 4],
      fromDate: isoDate(start),
      toDate: isoDate(end),
      output: 0,
      input: 0,
      net: 0,
      transactionCount: 0,
    };
  });

  for (const row of rows) {
    const month = localDate(row.date).getMonth();
    const quarterIndex = Math.floor(month / 3);
    const quarter = quarters[quarterIndex];
    if (!quarter) continue;

    if (row.category_type === "income") quarter.output += row.amount_vat;
    if (row.category_type === "expense") quarter.input += row.amount_vat;
    quarter.transactionCount++;
  }

  return quarters.map((quarter) => ({
    ...quarter,
    net: quarter.output - quarter.input,
  }));
}

export async function getMonthlyTotals(bookId?: string, monthsBack = 12): Promise<MonthlyTotals[]> {
  const db = await getDb();
  const start = addMonths(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    -(monthsBack - 1),
  );
  const startDate = isoDate(start);
  const conditions = ["t.date >= ?"];
  const params: string[] = [startDate];

  if (bookId) {
    conditions.push("t.book_id = ?");
    params.push(bookId);
  }

  const rows = await db.select<MonthlyTotals[]>(
    `SELECT
       strftime('%Y-%m', t.date) AS month,
       COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount_gross ELSE 0 END), 0) AS income,
       COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount_gross ELSE 0 END), 0) AS expense
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE ${conditions.join(" AND ")}
     GROUP BY month
     ORDER BY month ASC`,
    params,
  );
  const byMonth = new Map(rows.map((row) => [row.month, row]));

  return Array.from({ length: monthsBack }, (_, index) => {
    const date = addMonths(start, index);
    const month = monthKey(date);
    return byMonth.get(month) ?? { month, income: 0, expense: 0 };
  });
}

export async function getBookTransactionCounts(): Promise<BookTransactionCounts> {
  const db = await getDb();
  const rows = await db.select<Array<{ book_id: string; count: number }>>(
    `SELECT book_id, COUNT(*) AS count
     FROM transactions
     GROUP BY book_id`,
  );
  const counts: BookTransactionCounts = { all: 0, business: 0, personal: 0 };

  for (const row of rows) {
    const count = Number(row.count);
    counts.all += count;
    if (row.book_id === "book-business") counts.business = count;
    if (row.book_id === "book-personal") counts.personal = count;
  }

  return counts;
}

async function getOpeningBalance(bookId: string | undefined, beforeDate: string): Promise<number> {
  const db = await getDb();
  const accountConditions: string[] = [];
  const accountParams: string[] = [];

  if (bookId) {
    accountConditions.push("book_id = ?");
    accountParams.push(bookId);
  }

  const accountRows = await db.select<Array<{ total: number }>>(
    `SELECT COALESCE(SUM(initial_balance), 0) AS total
     FROM accounts
     ${accountConditions.length ? `WHERE ${accountConditions.join(" AND ")}` : ""}`,
    accountParams,
  );

  const txConditions = ["t.date < ?"];
  const txParams: Array<string | number> = [beforeDate];

  if (bookId) {
    txConditions.push("t.book_id = ?");
    txParams.push(bookId);
  }

  const transactions = await db.select<TransactionAnalyticsRow[]>(
    `SELECT t.date,
            t.amount_gross,
            t.amount_vat,
            t.recurring_template_id,
            c.type AS category_type
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE ${txConditions.join(" AND ")}`,
    txParams,
  );

  const txTotal = transactions.reduce((total, row) => total + signedGross(row), 0);
  return (accountRows[0]?.total ?? 0) + txTotal;
}

async function getMonthlyAverage(opts: {
  bookId?: string;
  historyStart: string;
  historyEnd: string;
  basePeriodMonths: number;
}): Promise<MonthlyAverage> {
  const db = await getDb();
  const conditions = [
    "t.date >= ?",
    "t.date <= ?",
    "(t.recurring_template_id IS NULL OR t.recurring_template_id = '')",
  ];
  const params: Array<string | number> = [opts.historyStart, opts.historyEnd];

  if (opts.bookId) {
    conditions.push("t.book_id = ?");
    params.push(opts.bookId);
  }

  const rows = await db.select<TransactionAnalyticsRow[]>(
    `SELECT t.date,
            t.amount_gross,
            t.amount_vat,
            t.recurring_template_id,
            c.type AS category_type
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );

  let income = 0;
  let expense = 0;
  const monthsWithData = new Set<string>();

  for (const row of rows) {
    monthsWithData.add(row.date.slice(0, 7));
    if (row.category_type === "income") income += row.amount_gross;
    if (row.category_type === "expense") expense += row.amount_gross;
  }

  return {
    income: income / opts.basePeriodMonths,
    expense: expense / opts.basePeriodMonths,
    monthsWithData: monthsWithData.size,
  };
}

function addRecurringToForecast(
  template: RecurringTemplateWithRelations,
  monthsByKey: Map<string, ForecastMonth>,
  forecastStart: string,
  forecastEnd: string,
) {
  let nextDue = computeNextDue(template);
  let safety = 0;

  while (nextDue && nextDue < forecastStart && safety < 120) {
    nextDue = nextDueAfter(template, nextDue);
    safety++;
  }

  while (nextDue && nextDue <= forecastEnd && safety < 240) {
    const bucket = monthsByKey.get(nextDue.slice(0, 7));
    if (bucket) applyForecastAmount(bucket, template.category_type, template.amount_gross);
    nextDue = nextDueAfter(template, nextDue);
    safety++;
  }
}

export async function getForecast(
  opts: {
    bookId?: string;
    monthsAhead?: number;
    basePeriodMonths?: number;
    startDate?: string;
  } = {},
): Promise<ForecastResult> {
  const monthsAhead = opts.monthsAhead ?? 12;
  const basePeriodMonths = opts.basePeriodMonths ?? 3;
  const start = opts.startDate ? localDate(opts.startDate) : new Date();
  const forecastStartDate = new Date(start.getFullYear(), start.getMonth(), 1);
  const forecastEndDate = lastDayOfMonth(addMonths(forecastStartDate, monthsAhead - 1));
  const forecastStart = isoDate(forecastStartDate);
  const forecastEnd = isoDate(forecastEndDate);
  const historyStart = isoDate(addMonths(forecastStartDate, -basePeriodMonths));
  const historyEnd = isoDate(
    new Date(forecastStartDate.getFullYear(), forecastStartDate.getMonth(), 0),
  );

  const months: ForecastMonth[] = Array.from({ length: monthsAhead }, (_, index) => {
    const date = addMonths(forecastStartDate, index);
    const from = new Date(date.getFullYear(), date.getMonth(), 1);
    const to = lastDayOfMonth(date);
    return {
      month: monthKey(date),
      label: monthLabel(date),
      fromDate: isoDate(from),
      toDate: isoDate(to),
      recurringIncome: 0,
      recurringExpense: 0,
      averageIncome: 0,
      averageExpense: 0,
      income: 0,
      expense: 0,
      net: 0,
      cumulative: 0,
    };
  });
  const monthsByKey = new Map(months.map((month) => [month.month, month]));
  const [templates, average, openingBalance] = await Promise.all([
    listRecurringTemplates(),
    getMonthlyAverage({
      bookId: opts.bookId,
      historyStart,
      historyEnd,
      basePeriodMonths,
    }),
    getOpeningBalance(opts.bookId, forecastStart),
  ]);

  const activeTemplates = templates.filter(
    (template) => template.active && (!opts.bookId || template.book_id === opts.bookId),
  );
  for (const template of activeTemplates) {
    addRecurringToForecast(template, monthsByKey, forecastStart, forecastEnd);
  }

  let cumulative = openingBalance;
  const projectedMonths = months.map((month) => {
    const nextMonth = {
      ...month,
      averageIncome: average.income,
      averageExpense: average.expense,
    };
    nextMonth.income = nextMonth.recurringIncome + nextMonth.averageIncome;
    nextMonth.expense = nextMonth.recurringExpense + nextMonth.averageExpense;
    nextMonth.net = nextMonth.income - nextMonth.expense;
    cumulative += nextMonth.net;
    nextMonth.cumulative = cumulative;
    return nextMonth;
  });

  return {
    months: projectedMonths,
    openingBalance,
    recurringCount: activeTemplates.length,
    basePeriodMonths,
    historyMonthsWithData: average.monthsWithData,
  };
}
