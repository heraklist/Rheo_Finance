import { documentDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";

import { getDb, now } from "@/lib/db";

const BACKUP_TABLES = [
  "books",
  "accounts",
  "categories",
  "tags",
  "recurring_templates",
  "transactions",
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
} as const satisfies Record<(typeof RESTORE_TABLES)[number], readonly string[]>;

type BackupTable = (typeof BACKUP_TABLES)[number];
type RestoreTable = (typeof RESTORE_TABLES)[number];
type BackupRow = Record<string, string | number | boolean | null>;
type SqlValue = string | number | null;

export interface BackupResult {
  path: string;
}

export interface RestoreResult {
  tablesRestored: number;
  rowsRestored: number;
}

export interface BackupOptions {
  auto?: boolean;
}

export const LAST_AUTO_BACKUP_KEY = "last_auto_backup_at";

function backupFileName(timestamp: string, auto: boolean): string {
  const prefix = auto ? "evochia-auto-backup" : "evochia-backup";
  return `${prefix}-${timestamp.replace(/[:.]/g, "-")}.json`;
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
    throw new Error("Το αρχείο δεν είναι Evochia Finance backup.");
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

async function restoreRows(table: RestoreTable, rows: BackupRow[]): Promise<number> {
  const allowedColumns = new Set<string>(RESTORE_TABLE_COLUMNS[table]);
  let restored = 0;

  for (const row of rows) {
    const cols = Object.keys(row).filter((column) => allowedColumns.has(column));
    if (cols.length === 0) continue;

    const placeholders = cols.map(() => "?").join(", ");
    const values = cols.map((column) => normalizeSqlValue(row[column]));
    const db = await getDb();

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
  const db = await getDb();
  let totalRows = 0;

  await db.execute("BEGIN");
  try {
    await db.execute("PRAGMA defer_foreign_keys = ON");
    await db.execute("DELETE FROM sync_outbox");

    for (const table of [...RESTORE_TABLES].reverse()) {
      await db.execute(`DELETE FROM ${table}`);
    }

    for (const table of RESTORE_TABLES) {
      totalRows += await restoreRows(table, tables[table]);
    }

    await db.execute("COMMIT");
    return { tablesRestored: RESTORE_TABLES.length, rowsRestored: totalRows };
  } catch (err) {
    await db.execute("ROLLBACK");
    throw err;
  }
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
  const db = await getDb();
  const tables: Record<BackupTable, BackupRow[]> = {} as Record<BackupTable, BackupRow[]>;

  for (const table of BACKUP_TABLES) {
    tables[table] = await db.select<BackupRow[]>(`SELECT * FROM ${table}`);
  }

  const timestamp = now();
  const documents = await documentDir();
  const backupDir = await join(documents, "Evochia_Backups");
  const fileName = backupFileName(timestamp, options.auto ?? false);
  const relativePath = `Evochia_Backups/${fileName}`;
  await mkdir("Evochia_Backups", { baseDir: BaseDirectory.Document, recursive: true });

  const path = await join(backupDir, fileName);
  const payload = {
    app: "Evochia Finance",
    version: 1,
    created_at: timestamp,
    tables,
  };

  await writeFile(relativePath, new TextEncoder().encode(JSON.stringify(payload, null, 2)), {
    baseDir: BaseDirectory.Document,
  });
  return { path };
}

export async function restoreFromBackup(file: File): Promise<RestoreResult> {
  return restoreFromBackupText(await file.text());
}

export async function restoreFromBackupPath(path: string): Promise<RestoreResult> {
  const bytes = await readFile(path);
  return restoreFromBackupText(new TextDecoder().decode(bytes));
}
