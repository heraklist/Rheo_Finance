import Database from "@tauri-apps/plugin-sql";

let dbPromise: Promise<Database> | null = null;

interface ForeignKeysPragmaRow {
  foreign_keys: number;
}

async function enableForeignKeyChecks(db: Database): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
  const rows = await db.select<ForeignKeysPragmaRow[]>("PRAGMA foreign_keys");

  if (Number(rows[0]?.foreign_keys ?? 0) !== 1) {
    throw new Error("SQLite foreign key enforcement could not be enabled.");
  }
}

async function initializeDb(): Promise<Database> {
  const db = await Database.load("sqlite:evochia.db");
  await enableForeignKeyChecks(db);
  return db;
}

/**
 * Get (or initialize) the local SQLite database instance.
 * Tauri's sql plugin runs migrations automatically on first connection
 * (configured in tauri.conf.json + lib.rs).
 */
export async function getDb(): Promise<Database> {
  dbPromise ??= initializeDb().catch((error: unknown) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

export async function runInTransaction<T>(operation: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDb();

  await db.execute("BEGIN IMMEDIATE");
  try {
    const result = await operation(db);
    await db.execute("COMMIT");
    return result;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}

/**
 * Generate a UUIDv4. Used for entity primary keys client-side.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Current ISO timestamp (UTC).
 */
export function now(): string {
  return new Date().toISOString();
}
