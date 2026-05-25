import { documentDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";

import { getDb, now, runWithDbLock } from "@/lib/db";

const BACKUP_TABLES = [
  "books",
  "accounts",
  "categories",
  "tags",
  "recurring_templates",
  "transactions",
  "plan",
  "plan_expense_item",
  "plan_income_item",
  "coverage_expense",
  "coverage_income",
  "sync_metadata",
  "sync_outbox",
] as const;

const RESTORE_TABLES = [
  "books",
  "accounts",
  "categories",
  "tags",
  "recurring_templates",
  "transactions",
  "plan",
  "plan_expense_item",
  "plan_income_item",
  "coverage_expense",
  "coverage_income",
] as const;

const RESTORE_TABLE_COLUMNS = {
  books: [
    "id",
    "slug",
    "name",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  accounts: [
    "id",
    "book_id",
    "name",
    "type",
    "initial_balance",
    "is_archived",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  categories: [
    "id",
    "book_id",
    "parent_id",
    "name",
    "type",
    "is_archived",
    "sort_order",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  tags: [
    "id",
    "name",
    "description",
    "is_archived",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  recurring_templates: [
    "id",
    "active",
    "description",
    "book_id",
    "account_id",
    "category_id",
    "tag_id",
    "amount_gross",
    "vat_rate",
    "frequency",
    "day_of_period",
    "start_date",
    "end_date",
    "last_generated",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  transactions: [
    "id",
    "date",
    "description",
    "book_id",
    "account_id",
    "category_id",
    "tag_id",
    "payment_method",
    "amount_gross",
    "vat_rate",
    "amount_vat",
    "amount_net",
    "receipt_photo_path",
    "recurring_template_id",
    "notes",
    "created_at",
    "updated_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  plan: [
    "id",
    "user_id",
    "book_id",
    "name",
    "type",
    "target_date",
    "status",
    "include_in_forecast",
    "notes",
    "created_at",
    "updated_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  plan_expense_item: [
    "id",
    "plan_id",
    "name",
    "amount",
    "type",
    "category",
    "priority",
    "account_id",
    "duration_months",
    "target_month",
    "included",
    "notes",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  plan_income_item: [
    "id",
    "plan_id",
    "name",
    "amount",
    "type",
    "category",
    "confidence",
    "duration_months",
    "target_month",
    "included",
    "notes",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  coverage_expense: [
    "id",
    "user_id",
    "book_id",
    "name",
    "amount",
    "type",
    "due_date",
    "month",
    "year",
    "paid",
    "linked_recurring_id",
    "linked_transaction_id",
    "notes",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
  coverage_income: [
    "id",
    "user_id",
    "book_id",
    "name",
    "amount",
    "confidence",
    "expected_date",
    "month",
    "year",
    "received",
    "linked_recurring_id",
    "linked_transaction_id",
    "notes",
    "created_at",
    "sync_status",
    "local_updated_at",
    "server_updated_at",
  ],
} as const satisfies Record<(typeof RESTORE_TABLES)[number], readonly string[]>;

type BackupTable = (typeof BACKUP_TABLES)[number];
type RestoreTable = (typeof RESTORE_TABLES)[number];
type BackupRow = Record<string, string | number | boolean | null>;
type SqlValue = string | number | null;

interface ForeignKeyViolation {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
}

export interface BackupResult {
  path: string;
}

export interface RestoreResult {
  tablesRestored: number;
  rowsRestored: number;
}

export interface BackupOptions {
  auto?: boolean;
  directoryPath?: string | null;
}

export const LAST_AUTO_BACKUP_KEY = "last_auto_backup_at";

function backupFileName(timestamp: string, auto: boolean): string {
  const prefix = auto ? "rheo-auto-backup" : "rheo-backup";
  return `${prefix}-${timestamp.replace(/[:.]/g, "-")}.json`;
}

export function createBackupFileName(options: BackupOptions = {}): string {
  return backupFileName(now(), options.auto ?? false);
}

export async function getDefaultBackupDirectory(): Promise<string> {
  return join(await documentDir(), "Rheo_Backups");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSqlValue(value: unknown): SqlValue {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new Error("Το backup περιέχει τιμή που δεν μπορεί να αποκατασταθεί.");
}

function parseBackupPayload(text: string): Record<RestoreTable, BackupRow[]> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Το αρχείο backup δεν είναι έγκυρο JSON.");
  }

  if (!isRecord(parsed) || !isRecord(parsed.tables)) {
    throw new Error("Το αρχείο δεν είναι Rheo Finance backup.");
  }

  const tables = {} as Record<RestoreTable, BackupRow[]>;

  for (const table of RESTORE_TABLES) {
    const rows = parsed.tables[table] ?? [];
    if (!Array.isArray(rows)) {
      throw new Error(`Το backup έχει λάθος μορφή για τον πίνακα ${table}.`);
    }
    tables[table] = rows.map((row) => {
      if (!isRecord(row)) {
        throw new Error(`Το backup έχει μη έγκυρη εγγραφή στον πίνακα ${table}.`);
      }
      return row as BackupRow;
    });
  }

  return tables;
}

async function restoreRows(
  db: Awaited<ReturnType<typeof getDb>>,
  table: RestoreTable,
  rows: BackupRow[],
): Promise<number> {
  const allowedColumns = new Set<string>(RESTORE_TABLE_COLUMNS[table]);
  let restored = 0;

  for (const row of rows) {
    const cols = Object.keys(row).filter((column) => allowedColumns.has(column));
    if (cols.length === 0) continue;

    const placeholders = cols.map(() => "?").join(", ");
    const values = cols.map((column) => normalizeSqlValue(row[column]));

    await db.execute(
      `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      values,
    );
    restored++;
  }

  return restored;
}

async function restoreFromBackupText(text: string): Promise<RestoreResult> {
  const tables = parseBackupPayload(text);
  return runWithDbLock(async (db) => {
    let totalRows = 0;
    let transactionStarted = false;

    try {
      await db.execute("PRAGMA foreign_keys = ON");
      await db.execute("BEGIN IMMEDIATE");
      transactionStarted = true;
      await db.execute("PRAGMA defer_foreign_keys = ON");
      await db.execute("DELETE FROM sync_outbox");

      for (const table of [...RESTORE_TABLES].reverse()) {
        await db.execute(`DELETE FROM ${table}`);
      }

      for (const table of RESTORE_TABLES) {
        totalRows += await restoreRows(db, table, tables[table]);
      }

      const violations = await db.select<ForeignKeyViolation[]>("PRAGMA foreign_key_check");
      if (violations.length > 0) {
        const first = violations[0];
        if (!first) throw new Error("Backup restore foreign key violation.");
        throw new Error(
          `Backup restore foreign key violation: ${first.table}.${first.rowid} -> ${first.parent}`,
        );
      }

      await db.execute("COMMIT");
      transactionStarted = false;

      // Re-enable foreign keys after the deferred-FK transaction completes.
      await db.execute("PRAGMA foreign_keys = ON");

      return { tablesRestored: RESTORE_TABLES.length, rowsRestored: totalRows };
    } catch (err) {
      if (transactionStarted) {
        try {
          await db.execute("ROLLBACK");
        } catch {
          // ROLLBACK best-effort — the connection may already be rolled back
        }
      }
      // Ensure FK enforcement is restored even after failure
      try {
        await db.execute("PRAGMA foreign_keys = ON");
      } catch {
        // best-effort
      }
      throw err;
    }
  });
}

export async function getLastAutoBackupAt(): Promise<string | null> {
  const db = await getDb();
  const result = await db.select<Array<{ value: string }>>(
    "SELECT value FROM sync_metadata WHERE key = ? LIMIT 1",
    [LAST_AUTO_BACKUP_KEY],
  );
  return result[0]?.value ?? null;
}

export async function markAutoBackupCompleted(timestamp = now()): Promise<string> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES (?, ?, ?)`,
    [LAST_AUTO_BACKUP_KEY, timestamp, timestamp],
  );
  return timestamp;
}

export async function createJsonBackup(options: BackupOptions = {}): Promise<BackupResult> {
  const timestamp = now();
  const fileName = backupFileName(timestamp, options.auto ?? false);
  const payload = await createBackupPayload(timestamp);
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2));

  if (options.directoryPath) {
    const path = await join(options.directoryPath, fileName);
    await writeFile(path, bytes);
    return { path };
  }

  await mkdir("Rheo_Backups", { baseDir: BaseDirectory.Document, recursive: true });
  const path = await join(await getDefaultBackupDirectory(), fileName);
  await writeFile(`Rheo_Backups/${fileName}`, bytes, {
    baseDir: BaseDirectory.Document,
  });
  return { path };
}

async function createBackupPayload(timestamp: string) {
  const db = await getDb();
  const tables: Record<BackupTable, BackupRow[]> = {} as Record<BackupTable, BackupRow[]>;

  for (const table of BACKUP_TABLES) {
    tables[table] = await db.select<BackupRow[]>(`SELECT * FROM ${table}`);
  }

  return {
    app: "Rheo Finance",
    version: 1,
    created_at: timestamp,
    tables,
  };
}

export async function saveJsonBackupToPath(path: string): Promise<BackupResult> {
  const payload = await createBackupPayload(now());
  await writeFile(path, new TextEncoder().encode(JSON.stringify(payload, null, 2)));
  return { path };
}

export async function restoreFromBackup(file: File): Promise<RestoreResult> {
  return restoreFromBackupText(await file.text());
}

export async function restoreFromBackupPath(path: string): Promise<RestoreResult> {
  const bytes = await readFile(path);
  return restoreFromBackupText(new TextDecoder().decode(bytes));
}
