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

function backupFileName(timestamp: string): string {
  return `evochia-backup-${timestamp.replace(/[:.]/g, "-")}.json`;
}

export async function createJsonBackup(): Promise<BackupResult> {
  const db = await getDb();
  const tables: Record<BackupTable, BackupRow[]> = {} as Record<BackupTable, BackupRow[]>;

  for (const table of BACKUP_TABLES) {
    tables[table] = await db.select<BackupRow[]>(`SELECT * FROM ${table}`);
  }

  const timestamp = now();
  const documents = await documentDir();
  const backupDir = await join(documents, "Evochia_Backups");
  const fileName = backupFileName(timestamp);
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
