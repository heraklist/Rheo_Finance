import { documentDir, join } from "@tauri-apps/api/path";
import { BaseDirectory, mkdir, writeFile } from "@tauri-apps/plugin-fs";

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

type BackupTable = (typeof BACKUP_TABLES)[number];
type BackupRow = Record<string, string | number | boolean | null>;

export interface BackupResult {
  path: string;
}

export interface BackupOptions {
  auto?: boolean;
}

export const LAST_AUTO_BACKUP_KEY = "last_auto_backup_at";

function backupFileName(timestamp: string, auto: boolean): string {
  const prefix = auto ? "evochia-auto-backup" : "evochia-backup";
  return `${prefix}-${timestamp.replace(/[:.]/g, "-")}.json`;
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
