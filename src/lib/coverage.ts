import { getDb, now, runInTransaction, uuid } from "@/lib/db";
import type {
  Confidence,
  CoverageExpense,
  CoverageExpenseType,
  CoverageIncome,
  CoverageSummary,
} from "@/lib/types";

type CoverageExpenseRow = Omit<CoverageExpense, "paid"> & { paid: number };
type CoverageIncomeRow = Omit<CoverageIncome, "received"> & { received: number };
type CountRow = { count: number };

interface RecurringCoverageRow {
  id: string;
  description: string;
  book_id: string;
  amount_gross: number;
  day_of_period: number;
  category_type: string;
}

export interface NewCoverageExpenseInput {
  book_id: string;
  name: string;
  amount: number;
  type?: CoverageExpenseType;
  due_date: number;
  month: number;
  year: number;
  paid?: boolean;
  linked_recurring_id?: string | null;
  linked_transaction_id?: string | null;
  notes?: string | null;
}

export interface NewCoverageIncomeInput {
  book_id: string;
  name: string;
  amount: number;
  confidence?: Confidence;
  expected_date: number;
  month: number;
  year: number;
  received?: boolean;
  linked_transaction_id?: string | null;
  notes?: string | null;
}

function toExpense(row: CoverageExpenseRow): CoverageExpense {
  return { ...row, paid: Boolean(row.paid) };
}

function toIncome(row: CoverageIncomeRow): CoverageIncome {
  return { ...row, received: Boolean(row.received) };
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Το όνομα είναι υποχρεωτικό.");
  return trimmed;
}

function normalizeAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Το ποσό πρέπει να είναι μη αρνητικός αριθμός.");
  }
  return Math.round(amount * 100) / 100;
}

function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(31, Math.max(1, Math.round(day)));
}

function assertMonth(month: number): number {
  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error("Ο μήνας κάλυψης δεν είναι έγκυρος.");
  }
  return month;
}

function assertYear(year: number): number {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Το έτος κάλυψης δεν είναι έγκυρο.");
  }
  return year;
}

async function enqueueOutbox(
  db: Awaited<ReturnType<typeof getDb>>,
  entityType: string,
  entityId: string,
  operation: "create" | "update" | "delete",
  payload: unknown,
  ts: string,
): Promise<void> {
  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [entityType, entityId, operation, JSON.stringify(payload), ts],
  );
}

function buildExpense(input: NewCoverageExpenseInput, ts: string): CoverageExpense {
  return {
    id: uuid(),
    book_id: input.book_id,
    name: normalizeName(input.name),
    amount: normalizeAmount(input.amount),
    type: input.type ?? "one_off",
    due_date: clampDay(input.due_date),
    month: assertMonth(input.month),
    year: assertYear(input.year),
    paid: input.paid ?? false,
    linked_recurring_id: input.linked_recurring_id ?? null,
    linked_transaction_id: input.linked_transaction_id ?? null,
    notes: input.notes?.trim() || null,
    created_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };
}

function buildIncome(input: NewCoverageIncomeInput, ts: string): CoverageIncome {
  return {
    id: uuid(),
    book_id: input.book_id,
    name: normalizeName(input.name),
    amount: normalizeAmount(input.amount),
    confidence: input.confidence ?? "high",
    expected_date: clampDay(input.expected_date),
    month: assertMonth(input.month),
    year: assertYear(input.year),
    received: input.received ?? false,
    linked_transaction_id: input.linked_transaction_id ?? null,
    notes: input.notes?.trim() || null,
    created_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };
}

async function insertExpense(
  db: Awaited<ReturnType<typeof getDb>>,
  item: CoverageExpense,
): Promise<void> {
  await db.execute(
    `INSERT INTO coverage_expense
      (id, book_id, name, amount, type, due_date, month, year, paid,
       linked_recurring_id, linked_transaction_id, notes, created_at,
       sync_status, local_updated_at, server_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.book_id,
      item.name,
      item.amount,
      item.type,
      item.due_date,
      item.month,
      item.year,
      item.paid ? 1 : 0,
      item.linked_recurring_id,
      item.linked_transaction_id,
      item.notes,
      item.created_at,
      item.sync_status,
      item.local_updated_at,
      item.server_updated_at,
    ],
  );
}

async function insertIncome(
  db: Awaited<ReturnType<typeof getDb>>,
  item: CoverageIncome,
): Promise<void> {
  await db.execute(
    `INSERT INTO coverage_income
      (id, book_id, name, amount, confidence, expected_date, month, year, received,
       linked_transaction_id, notes, created_at, sync_status, local_updated_at, server_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.book_id,
      item.name,
      item.amount,
      item.confidence,
      item.expected_date,
      item.month,
      item.year,
      item.received ? 1 : 0,
      item.linked_transaction_id,
      item.notes,
      item.created_at,
      item.sync_status,
      item.local_updated_at,
      item.server_updated_at,
    ],
  );
}

export async function ensureCoverageMonth(
  bookId: string,
  month: number,
  year: number,
): Promise<void> {
  const normalizedMonth = assertMonth(month);
  const normalizedYear = assertYear(year);
  const ts = now();

  await runInTransaction(async (db) => {
    const existing = await db.select<CountRow[]>(
      `SELECT
         (SELECT COUNT(*) FROM coverage_expense WHERE book_id = ? AND month = ? AND year = ?) +
         (SELECT COUNT(*) FROM coverage_income WHERE book_id = ? AND month = ? AND year = ?) AS count`,
      [bookId, normalizedMonth, normalizedYear, bookId, normalizedMonth, normalizedYear],
    );

    if (Number(existing[0]?.count ?? 0) > 0) return;

    const templates = await db.select<RecurringCoverageRow[]>(
      `SELECT rt.id,
              rt.description,
              rt.book_id,
              rt.amount_gross,
              rt.day_of_period,
              c.type AS category_type
       FROM recurring_templates rt
       JOIN categories c ON c.id = rt.category_id
       WHERE rt.book_id = ? AND rt.active = 1 AND c.type IN ('income', 'expense')`,
      [bookId],
    );

    for (const template of templates) {
      if (template.category_type === "expense") {
        const item = buildExpense(
          {
            book_id: bookId,
            name: template.description,
            amount: template.amount_gross,
            type: "recurring",
            due_date: template.day_of_period,
            month: normalizedMonth,
            year: normalizedYear,
            linked_recurring_id: template.id,
          },
          ts,
        );
        await insertExpense(db, item);
        await enqueueOutbox(db, "coverage_expense", item.id, "create", item, ts);
      } else if (template.category_type === "income") {
        const item = buildIncome(
          {
            book_id: bookId,
            name: template.description,
            amount: template.amount_gross,
            confidence: "high",
            expected_date: template.day_of_period,
            month: normalizedMonth,
            year: normalizedYear,
          },
          ts,
        );
        await insertIncome(db, item);
        await enqueueOutbox(db, "coverage_income", item.id, "create", item, ts);
      }
    }
  });
}

export async function listCoverageExpenses(
  bookId: string,
  month: number,
  year: number,
): Promise<CoverageExpense[]> {
  const db = await getDb();
  const rows = await db.select<CoverageExpenseRow[]>(
    `SELECT * FROM coverage_expense
     WHERE book_id = ? AND month = ? AND year = ?
     ORDER BY paid, due_date, created_at`,
    [bookId, assertMonth(month), assertYear(year)],
  );
  return rows.map(toExpense);
}

export async function listCoverageIncomes(
  bookId: string,
  month: number,
  year: number,
): Promise<CoverageIncome[]> {
  const db = await getDb();
  const rows = await db.select<CoverageIncomeRow[]>(
    `SELECT * FROM coverage_income
     WHERE book_id = ? AND month = ? AND year = ?
     ORDER BY received, expected_date, created_at`,
    [bookId, assertMonth(month), assertYear(year)],
  );
  return rows.map(toIncome);
}

export async function addCoverageExpense(input: NewCoverageExpenseInput): Promise<CoverageExpense> {
  const ts = now();
  const item = buildExpense(input, ts);

  await runInTransaction(async (db) => {
    await insertExpense(db, item);
    await enqueueOutbox(db, "coverage_expense", item.id, "create", item, ts);
  });

  return item;
}

export async function addCoverageIncome(input: NewCoverageIncomeInput): Promise<CoverageIncome> {
  const ts = now();
  const item = buildIncome(input, ts);

  await runInTransaction(async (db) => {
    await insertIncome(db, item);
    await enqueueOutbox(db, "coverage_income", item.id, "create", item, ts);
  });

  return item;
}

export async function toggleExpensePaid(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<CoverageExpenseRow[]>(
    "SELECT * FROM coverage_expense WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toExpense(rows[0]) : null;
  if (!existing) throw new Error("Το έξοδο κάλυψης δεν βρέθηκε.");

  const ts = now();
  const next = {
    ...existing,
    paid: !existing.paid,
    sync_status: "pending" as const,
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (txDb) => {
    await txDb.execute(
      `UPDATE coverage_expense
       SET paid = ?, sync_status = ?, local_updated_at = ?, server_updated_at = ?
       WHERE id = ?`,
      [next.paid ? 1 : 0, next.sync_status, next.local_updated_at, next.server_updated_at, id],
    );
    await enqueueOutbox(txDb, "coverage_expense", id, "update", next, ts);
  });
}

export async function toggleIncomeReceived(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<CoverageIncomeRow[]>(
    "SELECT * FROM coverage_income WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toIncome(rows[0]) : null;
  if (!existing) throw new Error("Το έσοδο κάλυψης δεν βρέθηκε.");

  const ts = now();
  const next = {
    ...existing,
    received: !existing.received,
    sync_status: "pending" as const,
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (txDb) => {
    await txDb.execute(
      `UPDATE coverage_income
       SET received = ?, sync_status = ?, local_updated_at = ?, server_updated_at = ?
       WHERE id = ?`,
      [next.received ? 1 : 0, next.sync_status, next.local_updated_at, next.server_updated_at, id],
    );
    await enqueueOutbox(txDb, "coverage_income", id, "update", next, ts);
  });
}

export async function deleteCoverageExpense(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<CoverageExpenseRow[]>(
    "SELECT * FROM coverage_expense WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toExpense(rows[0]) : null;
  if (!existing) throw new Error("Το έξοδο κάλυψης δεν βρέθηκε.");

  const ts = now();
  await runInTransaction(async (txDb) => {
    await txDb.execute("DELETE FROM coverage_expense WHERE id = ?", [id]);
    await enqueueOutbox(
      txDb,
      "coverage_expense",
      id,
      "delete",
      { ...existing, deleted_at: ts },
      ts,
    );
  });
}

export async function deleteCoverageIncome(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<CoverageIncomeRow[]>(
    "SELECT * FROM coverage_income WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toIncome(rows[0]) : null;
  if (!existing) throw new Error("Το έσοδο κάλυψης δεν βρέθηκε.");

  const ts = now();
  await runInTransaction(async (txDb) => {
    await txDb.execute("DELETE FROM coverage_income WHERE id = ?", [id]);
    await enqueueOutbox(txDb, "coverage_income", id, "delete", { ...existing, deleted_at: ts }, ts);
  });
}

export function calculateCoverageSummary(
  expenses: CoverageExpense[],
  incomes: CoverageIncome[],
): CoverageSummary {
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const paidExpenses = expenses
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + item.amount, 0);
  const receivedIncome = incomes
    .filter((item) => item.received)
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    total_expenses: totalExpenses,
    total_income: totalIncome,
    paid_expenses: paidExpenses,
    received_income: receivedIncome,
    balance: totalIncome - totalExpenses,
    coverage_pct: totalExpenses > 0 ? Math.round((totalIncome / totalExpenses) * 100) : 100,
    payment_progress_pct:
      totalExpenses > 0 ? Math.round((paidExpenses / totalExpenses) * 100) : 100,
  };
}

export function buildCumulativeData(
  expenses: CoverageExpense[],
  incomes: CoverageIncome[],
  daysInMonth: number,
): Array<{ day: string; balance: number }> {
  let balance = 0;
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    for (const income of incomes) {
      if (income.expected_date === day) balance += income.amount;
    }
    for (const expense of expenses) {
      if (expense.due_date === day) balance -= expense.amount;
    }
    return { day: String(day), balance };
  });
}
