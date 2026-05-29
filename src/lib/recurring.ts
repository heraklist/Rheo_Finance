import type Database from "@tauri-apps/plugin-sql";
import { enqueueOutbox, getDb, now, runInTransaction, uuid } from "@/lib/db";
import { insertTransactionRow } from "@/lib/transactions";
import type {
  Frequency,
  PaymentMethod,
  RecurringTemplate,
  RecurringTemplateWithRelations,
  Transaction,
} from "@/lib/types";
import { computeVat } from "@/lib/utils";

type RecurringDbRow = Omit<RecurringTemplateWithRelations, "active" | "next_due"> & {
  active: boolean | number;
  next_due?: string | null;
};

export interface RecurringTemplateInput {
  active: boolean;
  description: string;
  book_id: string;
  account_id: string;
  category_id: string;
  tag_id?: string | null;
  amount_gross: number;
  vat_rate: number;
  frequency: Frequency;
  day_of_period: number;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateRecurringTemplateInput extends RecurringTemplateInput {
  id: string;
}

const RECURRING_SELECT = `SELECT
       rt.*,
       b.name AS book_name,
       a.name AS account_name,
       c.name AS category_name,
       c.type AS category_type,
       tg.name AS tag_name
     FROM recurring_templates rt
     LEFT JOIN books b ON rt.book_id = b.id
     LEFT JOIN accounts a ON rt.account_id = a.id
     LEFT JOIN categories c ON rt.category_id = c.id
     LEFT JOIN tags tg ON rt.tag_id = tg.id`;

const GENERATED_PAYMENT_METHOD: PaymentMethod = "Τραπεζική μεταφορά";
const RECURRING_DAILY_CHECK_KEY = "recurring_last_checked_at";
const MAX_GENERATIONS_PER_RUN = 24;

type RecurringGenerationResult = { generated: number; skipped: number };

let recurringGenerationPromise: Promise<RecurringGenerationResult> | null = null;
let recurringDailyCheckPromise: Promise<RecurringGenerationResult> | null = null;

function activeFromDb(value: boolean | number): boolean {
  return value === true || value === 1;
}

function localDate(iso: string): Date {
  const parts = iso.slice(0, 10).split("-").map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day);
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIso(): string {
  return isoDate(new Date());
}

function compareDates(a: string, b: string): number {
  return a.localeCompare(b);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDay(year: number, monthIndex: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(year, monthIndex));
}

function monthlyCandidate(base: string, monthOffset: number, dayOfPeriod: number): string {
  const source = localDate(base);
  const candidate = new Date(source.getFullYear(), source.getMonth() + monthOffset, 1);
  candidate.setDate(clampDay(candidate.getFullYear(), candidate.getMonth(), dayOfPeriod));
  return isoDate(candidate);
}

function weeklyCandidate(base: string, dayOfPeriod: number): string {
  const source = localDate(base);
  const targetWeekday = Math.min(Math.max(dayOfPeriod, 1), 7);
  const sourceWeekday = source.getDay() === 0 ? 7 : source.getDay();
  const delta = (targetWeekday - sourceWeekday + 7) % 7;
  source.setDate(source.getDate() + delta);
  return isoDate(source);
}

function addDays(base: string, days: number): string {
  const date = localDate(base);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function nextAfterGenerated(
  generatedDate: string,
  frequency: Frequency,
  dayOfPeriod: number,
): string {
  if (frequency === "weekly") return weeklyCandidate(addDays(generatedDate, 1), dayOfPeriod);
  if (frequency === "monthly") return monthlyCandidate(generatedDate, 1, dayOfPeriod);
  if (frequency === "quarterly") return monthlyCandidate(generatedDate, 3, dayOfPeriod);
  return monthlyCandidate(generatedDate, 12, dayOfPeriod);
}

function firstDueFromStart(startDate: string, frequency: Frequency, dayOfPeriod: number): string {
  if (frequency === "weekly") return weeklyCandidate(startDate, dayOfPeriod);

  const offset = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  let candidate = monthlyCandidate(startDate, 0, dayOfPeriod);

  if (compareDates(candidate, startDate) < 0) {
    candidate = monthlyCandidate(candidate, offset, dayOfPeriod);
  }

  return candidate;
}

function normalizeTemplate(row: RecurringDbRow): RecurringTemplateWithRelations {
  const template = {
    ...row,
    active: activeFromDb(row.active),
  };

  return {
    ...template,
    next_due: computeNextDue(template),
  };
}

function outboxPayload(template: RecurringTemplate): RecurringTemplate {
  return {
    id: template.id,
    active: activeFromDb(template.active),
    description: template.description,
    book_id: template.book_id,
    account_id: template.account_id,
    category_id: template.category_id,
    tag_id: template.tag_id,
    amount_gross: template.amount_gross,
    vat_rate: template.vat_rate,
    frequency: template.frequency,
    day_of_period: template.day_of_period,
    start_date: template.start_date,
    end_date: template.end_date,
    last_generated: template.last_generated,
    created_at: template.created_at,
    sync_status: template.sync_status,
    local_updated_at: template.local_updated_at,
    server_updated_at: template.server_updated_at,
  };
}

export function computeNextDue(
  template: Pick<
    RecurringTemplate,
    "active" | "frequency" | "day_of_period" | "start_date" | "end_date" | "last_generated"
  >,
): string | null {
  if (!activeFromDb(template.active)) return null;

  const nextDue = template.last_generated
    ? nextAfterGenerated(template.last_generated, template.frequency, template.day_of_period)
    : firstDueFromStart(template.start_date, template.frequency, template.day_of_period);

  if (template.end_date && compareDates(nextDue, template.end_date) > 0) return null;
  return nextDue;
}

export async function listRecurringTemplates(): Promise<RecurringTemplateWithRelations[]> {
  const db = await getDb();
  const rows = await db.select<RecurringDbRow[]>(
    `${RECURRING_SELECT}
     ORDER BY rt.active DESC, rt.created_at DESC`,
  );

  return rows.map(normalizeTemplate);
}

export async function getRecurringTemplate(
  id: string,
): Promise<RecurringTemplateWithRelations | null> {
  const db = await getDb();
  const rows = await db.select<RecurringDbRow[]>(
    `${RECURRING_SELECT}
     WHERE rt.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? normalizeTemplate(rows[0]) : null;
}

export async function createRecurringTemplate(
  input: RecurringTemplateInput,
): Promise<RecurringTemplate> {
  const ts = now();
  const template: RecurringTemplate = {
    id: uuid(),
    active: input.active,
    description: input.description,
    book_id: input.book_id,
    account_id: input.account_id,
    category_id: input.category_id,
    tag_id: input.tag_id ?? null,
    amount_gross: input.amount_gross,
    vat_rate: input.vat_rate,
    frequency: input.frequency,
    day_of_period: input.day_of_period,
    start_date: input.start_date,
    end_date: input.end_date ?? null,
    last_generated: null,
    created_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `INSERT INTO recurring_templates
         (id, active, description, book_id, account_id, category_id, tag_id,
          amount_gross, vat_rate, frequency, day_of_period, start_date, end_date,
          last_generated, created_at, sync_status, local_updated_at, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        template.id,
        template.active ? 1 : 0,
        template.description,
        template.book_id,
        template.account_id,
        template.category_id,
        template.tag_id,
        template.amount_gross,
        template.vat_rate,
        template.frequency,
        template.day_of_period,
        template.start_date,
        template.end_date,
        template.last_generated,
        template.created_at,
        template.sync_status,
        template.local_updated_at,
        template.server_updated_at,
      ],
    );

    await enqueueOutbox(
      db,
      "recurring_template",
      template.id,
      "create",
      outboxPayload(template),
      ts,
    );
  });

  return template;
}

export async function updateRecurringTemplate(
  input: UpdateRecurringTemplateInput,
): Promise<RecurringTemplate> {
  const existing = await getRecurringTemplate(input.id);
  if (!existing) throw new Error("Recurring template not found");

  const ts = now();
  const template: RecurringTemplate = {
    id: input.id,
    active: input.active,
    description: input.description,
    book_id: input.book_id,
    account_id: input.account_id,
    category_id: input.category_id,
    tag_id: input.tag_id ?? null,
    amount_gross: input.amount_gross,
    vat_rate: input.vat_rate,
    frequency: input.frequency,
    day_of_period: input.day_of_period,
    start_date: input.start_date,
    end_date: input.end_date ?? null,
    last_generated: existing.last_generated,
    created_at: existing.created_at,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `UPDATE recurring_templates
       SET active = ?,
           description = ?,
           book_id = ?,
           account_id = ?,
           category_id = ?,
           tag_id = ?,
           amount_gross = ?,
           vat_rate = ?,
           frequency = ?,
           day_of_period = ?,
           start_date = ?,
           end_date = ?,
           sync_status = ?,
           local_updated_at = ?,
           server_updated_at = ?
       WHERE id = ?`,
      [
        template.active ? 1 : 0,
        template.description,
        template.book_id,
        template.account_id,
        template.category_id,
        template.tag_id,
        template.amount_gross,
        template.vat_rate,
        template.frequency,
        template.day_of_period,
        template.start_date,
        template.end_date,
        template.sync_status,
        template.local_updated_at,
        template.server_updated_at,
        template.id,
      ],
    );

    await enqueueOutbox(
      db,
      "recurring_template",
      template.id,
      "update",
      outboxPayload(template),
      ts,
    );
  });

  return template;
}

export async function setRecurringTemplateActive(id: string, active: boolean): Promise<void> {
  const existing = await getRecurringTemplate(id);
  if (!existing) throw new Error("Recurring template not found");

  await updateRecurringTemplate({
    ...existing,
    active,
  });
}

async function queueTransactionRecurringDetach(
  db: Database,
  tx: Transaction,
  ts: string,
): Promise<void> {
  const payload: Transaction = {
    ...tx,
    recurring_template_id: null,
    updated_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await enqueueOutbox(db, "transaction", tx.id, "update", payload, ts);
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  const existing = await getRecurringTemplate(id);
  if (!existing) throw new Error("Recurring template not found");

  const ts = now();
  const deleteTs = new Date(Date.parse(ts) + 1).toISOString();

  await runInTransaction(async (txDb) => {
    const linkedTransactions = await txDb.select<Transaction[]>(
      "SELECT * FROM transactions WHERE recurring_template_id = ?",
      [id],
    );

    for (const tx of linkedTransactions) {
      await txDb.execute(
        `UPDATE transactions
         SET recurring_template_id = NULL,
             updated_at = ?,
             sync_status = 'pending',
             local_updated_at = ?,
             server_updated_at = NULL
         WHERE id = ?`,
        [ts, ts, tx.id],
      );
      await queueTransactionRecurringDetach(txDb, tx, ts);
    }

    await txDb.execute("DELETE FROM recurring_templates WHERE id = ?", [id]);

    await enqueueOutbox(
      txDb,
      "recurring_template",
      id,
      "delete",
      { ...outboxPayload(existing), deleted_at: deleteTs },
      deleteTs,
    );
  });
}

/**
 * Mark a recurring template as generated for a given date.
 * When `db` is provided, runs inside an existing transaction (no new lock).
 * When omitted, wraps in its own transaction.
 */
async function markRecurringGenerated(
  template: RecurringTemplateWithRelations,
  generatedDate: string,
  existingDb?: Awaited<ReturnType<typeof getDb>>,
): Promise<void> {
  const ts = now();
  const nextTemplate: RecurringTemplate = {
    ...template,
    last_generated: generatedDate,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  const exec = async (db: Awaited<ReturnType<typeof getDb>>) => {
    await db.execute(
      `UPDATE recurring_templates
       SET last_generated = ?,
           sync_status = 'pending',
           local_updated_at = ?,
           server_updated_at = NULL
       WHERE id = ?`,
      [generatedDate, ts, template.id],
    );

    await enqueueOutbox(
      db,
      "recurring_template",
      template.id,
      "update",
      outboxPayload(nextTemplate),
      ts,
    );
  };

  if (existingDb) {
    await exec(existingDb);
  } else {
    await runInTransaction(exec);
  }
}

async function generatedTransactionExists(templateId: string, date: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) AS count FROM transactions WHERE recurring_template_id = ? AND date = ?",
    [templateId, date],
  );

  return (rows[0]?.count ?? 0) > 0;
}

export async function generateDueRecurringTransactions(
  today: string = todayIso(),
): Promise<RecurringGenerationResult> {
  if (recurringGenerationPromise) return recurringGenerationPromise;

  recurringGenerationPromise = generateDueRecurringTransactionsOnce(today).finally(() => {
    recurringGenerationPromise = null;
  });

  return recurringGenerationPromise;
}

async function generateDueRecurringTransactionsOnce(
  today: string,
): Promise<RecurringGenerationResult> {
  const templates = (await listRecurringTemplates()).filter((template) => template.active);
  let generated = 0;
  let skipped = 0;

  for (const template of templates) {
    let currentTemplate = template;
    let nextDue = currentTemplate.next_due;
    let safety = 0;

    while (nextDue && compareDates(nextDue, today) <= 0 && safety < MAX_GENERATIONS_PER_RUN) {
      const dueDate: string = nextDue;
      if (currentTemplate.end_date && compareDates(dueDate, currentTemplate.end_date) > 0) break;

      if (await generatedTransactionExists(currentTemplate.id, dueDate)) {
        await markRecurringGenerated(currentTemplate, dueDate);
        skipped++;
      } else {
        // Atomic: create transaction + mark template as generated in one transaction
        await runInTransaction(async (db) => {
          const txId = uuid();
          const ts = now();
          const { vat: amount_vat, net: amount_net } = computeVat(
            currentTemplate.amount_gross,
            currentTemplate.vat_rate,
          );
          await insertTransactionRow(
            db,
            {
              id: txId,
              date: dueDate,
              description: currentTemplate.description,
              book_id: currentTemplate.book_id,
              account_id: currentTemplate.account_id,
              category_id: currentTemplate.category_id,
              tag_id: currentTemplate.tag_id ?? null,
              payment_method: GENERATED_PAYMENT_METHOD,
              amount_gross: currentTemplate.amount_gross,
              vat_rate: currentTemplate.vat_rate,
              amount_vat,
              amount_net,
              receipt_photo_path: null,
              recurring_template_id: currentTemplate.id,
              notes: null,
              created_at: ts,
              updated_at: ts,
              sync_status: "pending",
              local_updated_at: ts,
              server_updated_at: null,
            },
            ts,
          );
          await markRecurringGenerated(currentTemplate, dueDate, db);
        });
        generated++;
      }

      currentTemplate = {
        ...currentTemplate,
        last_generated: dueDate,
      };
      nextDue = computeNextDue(currentTemplate);
      safety++;
    }
  }

  return { generated, skipped };
}

export async function runRecurringDailyCheck(): Promise<RecurringGenerationResult> {
  if (recurringDailyCheckPromise) return recurringDailyCheckPromise;

  recurringDailyCheckPromise = runRecurringDailyCheckOnce().finally(() => {
    recurringDailyCheckPromise = null;
  });

  return recurringDailyCheckPromise;
}

async function runRecurringDailyCheckOnce(): Promise<RecurringGenerationResult> {
  const db = await getDb();
  const today = todayIso();
  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM sync_metadata WHERE key = ? LIMIT 1",
    [RECURRING_DAILY_CHECK_KEY],
  );

  if (rows[0]?.value === today) {
    return { generated: 0, skipped: 0 };
  }

  const result = await generateDueRecurringTransactions(today);
  const ts = now();

  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES (?, ?, ?)`,
    [RECURRING_DAILY_CHECK_KEY, today, ts],
  );

  return result;
}
