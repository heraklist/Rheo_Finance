import { getDb, now, runInTransaction, uuid } from "@/lib/db";
import type {
  Confidence,
  Plan,
  PlanExpenseItem,
  PlanIncomeItem,
  PlanItemType,
  PlanStatus,
  PlanType,
  PlanWithTotals,
  Priority,
} from "@/lib/types";

type PlanRow = Omit<Plan, "include_in_forecast"> & { include_in_forecast: number };
type PlanWithTotalsRow = PlanRow & {
  total_expenses: number;
  total_income: number;
  funding_gap: number;
  expense_count: number;
  income_count: number;
};
type PlanExpenseItemRow = Omit<PlanExpenseItem, "included"> & { included: number };
type PlanIncomeItemRow = Omit<PlanIncomeItem, "included"> & { included: number };

export interface NewPlanInput {
  book_id: string;
  name: string;
  type?: PlanType;
  target_date?: string | null;
  status?: PlanStatus;
  include_in_forecast?: boolean;
  notes?: string | null;
}

export interface UpdatePlanInput {
  name?: string;
  type?: PlanType;
  target_date?: string | null;
  status?: PlanStatus;
  include_in_forecast?: boolean;
  notes?: string | null;
}

export interface NewPlanExpenseItemInput {
  plan_id: string;
  name: string;
  amount: number;
  type?: PlanItemType;
  category?: string;
  priority?: Priority;
  account_id?: string | null;
  duration_months?: number;
  target_month?: number;
  included?: boolean;
  notes?: string | null;
}

export interface NewPlanIncomeItemInput {
  plan_id: string;
  name: string;
  amount: number;
  type?: PlanItemType;
  category?: string;
  confidence?: Confidence;
  duration_months?: number;
  target_month?: number;
  included?: boolean;
  notes?: string | null;
}

export const PLAN_TEMPLATES: Array<{
  type: PlanType;
  label: string;
  description: string;
}> = [
  {
    type: "purchase",
    label: "Μεγάλη αγορά",
    description: "Εξοπλισμός ή μεγάλο αντικείμενο",
  },
  {
    type: "travel",
    label: "Ταξίδι",
    description: "Πτήσεις, διαμονή και ημερήσιο budget",
  },
  {
    type: "project",
    label: "Επέκταση δραστηριότητας",
    description: "Εργαλεία, κόστη εκκίνησης και λογισμικό",
  },
  {
    type: "emergency",
    label: "Αποθεματικό ανάγκης",
    description: "Μηνιαία συνεισφορά σε reserve",
  },
  {
    type: "debt",
    label: "Αποπληρωμή",
    description: "Δόσεις και πρόγραμμα αποπληρωμής",
  },
  {
    type: "custom",
    label: "Κενό σχέδιο",
    description: "Σχέδιο χωρίς πρότυπο",
  },
];

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

function positiveInt(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.round(value));
}

function toPlan(row: PlanRow): Plan {
  return {
    ...row,
    include_in_forecast: Boolean(row.include_in_forecast),
  };
}

function toPlanWithTotals(row: PlanWithTotalsRow): PlanWithTotals {
  return {
    ...toPlan(row),
    total_expenses: Number(row.total_expenses ?? 0),
    total_income: Number(row.total_income ?? 0),
    funding_gap: Number(row.funding_gap ?? 0),
    expense_count: Number(row.expense_count ?? 0),
    income_count: Number(row.income_count ?? 0),
  };
}

function toExpenseItem(row: PlanExpenseItemRow): PlanExpenseItem {
  return { ...row, included: Boolean(row.included) };
}

function toIncomeItem(row: PlanIncomeItemRow): PlanIncomeItem {
  return { ...row, included: Boolean(row.included) };
}

function planPayload(plan: Plan): Plan {
  return {
    id: plan.id,
    user_id: plan.user_id,
    book_id: plan.book_id,
    name: plan.name,
    type: plan.type,
    target_date: plan.target_date,
    status: plan.status,
    include_in_forecast: plan.include_in_forecast,
    notes: plan.notes,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
    sync_status: plan.sync_status,
    local_updated_at: plan.local_updated_at,
    server_updated_at: plan.server_updated_at,
  };
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

const PLAN_TOTALS_SQL = `SELECT
    p.*,
    COALESCE(exp.total_expenses, 0) AS total_expenses,
    COALESCE(inc.total_income, 0) AS total_income,
    COALESCE(exp.total_expenses, 0) - COALESCE(inc.total_income, 0) AS funding_gap,
    COALESCE(exp.expense_count, 0) AS expense_count,
    COALESCE(inc.income_count, 0) AS income_count
  FROM plan p
  LEFT JOIN (
    SELECT plan_id,
           SUM(CASE WHEN included = 1 THEN amount * duration_months ELSE 0 END) AS total_expenses,
           COUNT(*) AS expense_count
    FROM plan_expense_item
    GROUP BY plan_id
  ) exp ON exp.plan_id = p.id
  LEFT JOIN (
    SELECT plan_id,
           SUM(CASE WHEN included = 1 THEN amount * duration_months ELSE 0 END) AS total_income,
           COUNT(*) AS income_count
    FROM plan_income_item
    GROUP BY plan_id
  ) inc ON inc.plan_id = p.id`;

export async function listPlans(bookId: string): Promise<PlanWithTotals[]> {
  const db = await getDb();
  const rows = await db.select<PlanWithTotalsRow[]>(
    `${PLAN_TOTALS_SQL}
     WHERE p.book_id = ?
     ORDER BY
       CASE p.status
         WHEN 'active' THEN 0
         WHEN 'draft' THEN 1
         WHEN 'paused' THEN 2
         ELSE 3
       END,
       p.updated_at DESC`,
    [bookId],
  );
  return rows.map(toPlanWithTotals);
}

export async function getPlan(id: string): Promise<PlanWithTotals | null> {
  const db = await getDb();
  const rows = await db.select<PlanWithTotalsRow[]>(
    `${PLAN_TOTALS_SQL}
     WHERE p.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] ? toPlanWithTotals(rows[0]) : null;
}

export async function createPlan(input: NewPlanInput): Promise<Plan> {
  const ts = now();
  const plan: Plan = {
    id: uuid(),
    book_id: input.book_id,
    name: normalizeName(input.name),
    type: input.type ?? "custom",
    target_date: input.target_date ?? null,
    status: input.status ?? "draft",
    include_in_forecast: input.include_in_forecast ?? false,
    notes: input.notes?.trim() || null,
    created_at: ts,
    updated_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `INSERT INTO plan
        (id, book_id, name, type, target_date, status, include_in_forecast, notes,
         created_at, updated_at, sync_status, local_updated_at, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plan.id,
        plan.book_id,
        plan.name,
        plan.type,
        plan.target_date,
        plan.status,
        plan.include_in_forecast ? 1 : 0,
        plan.notes,
        plan.created_at,
        plan.updated_at,
        plan.sync_status,
        plan.local_updated_at,
        plan.server_updated_at,
      ],
    );
    await enqueueOutbox(db, "plan", plan.id, "create", planPayload(plan), ts);
  });

  return plan;
}

export async function updatePlan(id: string, patch: UpdatePlanInput): Promise<Plan> {
  const existing = await getPlan(id);
  if (!existing) throw new Error("Το σχέδιο δεν βρέθηκε.");

  const ts = now();
  const plan: Plan = {
    id: existing.id,
    user_id: existing.user_id,
    book_id: existing.book_id,
    name: patch.name !== undefined ? normalizeName(patch.name) : existing.name,
    type: patch.type ?? existing.type,
    target_date: patch.target_date !== undefined ? patch.target_date : existing.target_date,
    status: patch.status ?? existing.status,
    include_in_forecast: patch.include_in_forecast ?? existing.include_in_forecast,
    notes: patch.notes !== undefined ? patch.notes?.trim() || null : existing.notes,
    created_at: existing.created_at,
    updated_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `UPDATE plan
       SET name = ?,
           type = ?,
           target_date = ?,
           status = ?,
           include_in_forecast = ?,
           notes = ?,
           updated_at = ?,
           sync_status = ?,
           local_updated_at = ?,
           server_updated_at = ?
       WHERE id = ?`,
      [
        plan.name,
        plan.type,
        plan.target_date,
        plan.status,
        plan.include_in_forecast ? 1 : 0,
        plan.notes,
        plan.updated_at,
        plan.sync_status,
        plan.local_updated_at,
        plan.server_updated_at,
        plan.id,
      ],
    );
    await enqueueOutbox(db, "plan", plan.id, "update", planPayload(plan), ts);
  });

  return plan;
}

export async function deletePlan(id: string): Promise<void> {
  const existing = await getPlan(id);
  if (!existing) throw new Error("Το σχέδιο δεν βρέθηκε.");

  const ts = now();
  await runInTransaction(async (db) => {
    await db.execute("DELETE FROM plan WHERE id = ?", [id]);
    await enqueueOutbox(db, "plan", id, "delete", { ...planPayload(existing), deleted_at: ts }, ts);
  });
}

export async function listPlanExpenseItems(planId: string): Promise<PlanExpenseItem[]> {
  const db = await getDb();
  const rows = await db.select<PlanExpenseItemRow[]>(
    `SELECT * FROM plan_expense_item
     WHERE plan_id = ?
     ORDER BY target_month, created_at`,
    [planId],
  );
  return rows.map(toExpenseItem);
}

export async function listPlanIncomeItems(planId: string): Promise<PlanIncomeItem[]> {
  const db = await getDb();
  const rows = await db.select<PlanIncomeItemRow[]>(
    `SELECT * FROM plan_income_item
     WHERE plan_id = ?
     ORDER BY target_month, created_at`,
    [planId],
  );
  return rows.map(toIncomeItem);
}

export async function createPlanExpenseItem(
  input: NewPlanExpenseItemInput,
): Promise<PlanExpenseItem> {
  const ts = now();
  const item: PlanExpenseItem = {
    id: uuid(),
    plan_id: input.plan_id,
    name: normalizeName(input.name),
    amount: normalizeAmount(input.amount),
    type: input.type ?? "one_off",
    category: input.category?.trim() ?? "",
    priority: input.priority ?? "essential",
    account_id: input.account_id ?? null,
    duration_months: positiveInt(input.duration_months, 1),
    target_month: positiveInt(input.target_month, 1),
    included: input.included ?? true,
    notes: input.notes?.trim() || null,
    created_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `INSERT INTO plan_expense_item
        (id, plan_id, name, amount, type, category, priority, account_id,
         duration_months, target_month, included, notes, created_at,
         sync_status, local_updated_at, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.plan_id,
        item.name,
        item.amount,
        item.type,
        item.category,
        item.priority,
        item.account_id,
        item.duration_months,
        item.target_month,
        item.included ? 1 : 0,
        item.notes,
        item.created_at,
        item.sync_status,
        item.local_updated_at,
        item.server_updated_at,
      ],
    );
    await enqueueOutbox(db, "plan_expense_item", item.id, "create", item, ts);
  });

  return item;
}

export async function createPlanIncomeItem(input: NewPlanIncomeItemInput): Promise<PlanIncomeItem> {
  const ts = now();
  const item: PlanIncomeItem = {
    id: uuid(),
    plan_id: input.plan_id,
    name: normalizeName(input.name),
    amount: normalizeAmount(input.amount),
    type: input.type ?? "one_off",
    category: input.category?.trim() ?? "",
    confidence: input.confidence ?? "high",
    duration_months: positiveInt(input.duration_months, 1),
    target_month: positiveInt(input.target_month, 1),
    included: input.included ?? true,
    notes: input.notes?.trim() || null,
    created_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `INSERT INTO plan_income_item
        (id, plan_id, name, amount, type, category, confidence, duration_months,
         target_month, included, notes, created_at, sync_status, local_updated_at, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.plan_id,
        item.name,
        item.amount,
        item.type,
        item.category,
        item.confidence,
        item.duration_months,
        item.target_month,
        item.included ? 1 : 0,
        item.notes,
        item.created_at,
        item.sync_status,
        item.local_updated_at,
        item.server_updated_at,
      ],
    );
    await enqueueOutbox(db, "plan_income_item", item.id, "create", item, ts);
  });

  return item;
}

export async function togglePlanExpenseIncluded(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<PlanExpenseItemRow[]>(
    "SELECT * FROM plan_expense_item WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toExpenseItem(rows[0]) : null;
  if (!existing) throw new Error("Το έξοδο δεν βρέθηκε.");

  const ts = now();
  const next = { ...existing, included: !existing.included, sync_status: "pending" as const };
  next.local_updated_at = ts;
  next.server_updated_at = null;

  await runInTransaction(async (txDb) => {
    await txDb.execute(
      `UPDATE plan_expense_item
       SET included = ?, sync_status = ?, local_updated_at = ?, server_updated_at = ?
       WHERE id = ?`,
      [next.included ? 1 : 0, next.sync_status, next.local_updated_at, next.server_updated_at, id],
    );
    await enqueueOutbox(txDb, "plan_expense_item", id, "update", next, ts);
  });
}

export async function togglePlanIncomeIncluded(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<PlanIncomeItemRow[]>(
    "SELECT * FROM plan_income_item WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toIncomeItem(rows[0]) : null;
  if (!existing) throw new Error("Το έσοδο δεν βρέθηκε.");

  const ts = now();
  const next = { ...existing, included: !existing.included, sync_status: "pending" as const };
  next.local_updated_at = ts;
  next.server_updated_at = null;

  await runInTransaction(async (txDb) => {
    await txDb.execute(
      `UPDATE plan_income_item
       SET included = ?, sync_status = ?, local_updated_at = ?, server_updated_at = ?
       WHERE id = ?`,
      [next.included ? 1 : 0, next.sync_status, next.local_updated_at, next.server_updated_at, id],
    );
    await enqueueOutbox(txDb, "plan_income_item", id, "update", next, ts);
  });
}

export async function deletePlanExpenseItem(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<PlanExpenseItemRow[]>(
    "SELECT * FROM plan_expense_item WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toExpenseItem(rows[0]) : null;
  if (!existing) throw new Error("Το έξοδο δεν βρέθηκε.");

  const ts = now();
  await runInTransaction(async (txDb) => {
    await txDb.execute("DELETE FROM plan_expense_item WHERE id = ?", [id]);
    await enqueueOutbox(
      txDb,
      "plan_expense_item",
      id,
      "delete",
      { ...existing, deleted_at: ts },
      ts,
    );
  });
}

export async function deletePlanIncomeItem(id: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<PlanIncomeItemRow[]>(
    "SELECT * FROM plan_income_item WHERE id = ? LIMIT 1",
    [id],
  );
  const existing = rows[0] ? toIncomeItem(rows[0]) : null;
  if (!existing) throw new Error("Το έσοδο δεν βρέθηκε.");

  const ts = now();
  await runInTransaction(async (txDb) => {
    await txDb.execute("DELETE FROM plan_income_item WHERE id = ?", [id]);
    await enqueueOutbox(
      txDb,
      "plan_income_item",
      id,
      "delete",
      { ...existing, deleted_at: ts },
      ts,
    );
  });
}

export function monthsUntilTarget(targetDate: string | null, from = new Date()): number {
  if (!targetDate) return 1;
  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) return 1;
  return Math.max(
    1,
    (target.getFullYear() - from.getFullYear()) * 12 + target.getMonth() - from.getMonth() + 1,
  );
}

export function calculateBudgetPressure(
  fundingGap: number,
  targetDate: string | null,
  availableMonthly: number,
): number {
  if (fundingGap <= 0) return 0;
  if (availableMonthly <= 0) return 100;
  const requiredMonthly = fundingGap / monthsUntilTarget(targetDate);
  return Math.min(100, Math.round((requiredMonthly / availableMonthly) * 100));
}
