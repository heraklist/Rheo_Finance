import Database from "@tauri-apps/plugin-sql";

export const LOCAL_DATA_CHANGED_EVENT = "rheo:local-data-changed";

let dbPromise: Promise<Database> | null = null;
let transactionQueue: Promise<void> = Promise.resolve();

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
  // Keep the legacy storage filename so upgrades do not create an empty DB.
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

export async function runWithDbLock<T>(operation: (db: Database) => Promise<T>): Promise<T> {
  const previous = transactionQueue;
  let release!: () => void;
  transactionQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const db = await getDb();
    return await operation(db);
  } finally {
    release();
  }
}

export async function runInTransaction<T>(operation: (db: Database) => Promise<T>): Promise<T> {
  return runWithDbLock(async (db) => {
    await enableForeignKeyChecks(db);
    await db.execute("BEGIN IMMEDIATE");
    try {
      const result = await operation(db);
      await db.execute("COMMIT");
      return result;
    } catch (error) {
      await db.execute("ROLLBACK");
      throw error;
    } finally {
      await enableForeignKeyChecks(db);
    }
  });
}

/**
 * Generate a UUIDv4. Used for entity primary keys client-side.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  throw new Error("Secure UUID generation is unavailable in this runtime.");
}

/**
 * Current ISO timestamp (UTC).
 */
export function now(): string {
  return new Date().toISOString();
}

function notifyLocalDataChanged(): void {
  if (typeof window === "undefined") return;

  // The outbox row is created inside the caller's transaction. Dispatch after the
  // current call stack so the transaction has time to commit before sync reads it.
  window.setTimeout(() => {
    window.dispatchEvent(new Event(LOCAL_DATA_CHANGED_EVENT));
  }, 250);
}

/**
 * Enqueue a sync outbox entry with deduplication.
 *
 * For "create" and "update" operations, removes any prior outbox entries for
 * the same entity so that only the latest mutation is pushed during sync.
 * For "delete" operations, removes prior "create"/"update" entries (the delete
 * supersedes them all).
 *
 * Must be called inside a `runInTransaction` block so the DELETE + INSERT
 * are atomic with the entity mutation.
 */
export async function enqueueOutbox(
  db: Database,
  entityType: string,
  entityId: string,
  operation: "create" | "update" | "delete",
  payload: unknown,
  ts: string,
): Promise<void> {
  // Remove stale outbox entries for this entity
  await db.execute(
    "DELETE FROM sync_outbox WHERE entity_type = ? AND entity_id = ? AND operation IN ('create', 'update')",
    [entityType, entityId],
  );

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [entityType, entityId, operation, JSON.stringify(payload), ts],
  );

  notifyLocalDataChanged();
}
