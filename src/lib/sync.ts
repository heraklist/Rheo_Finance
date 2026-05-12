import { getDb, now } from "@/lib/db";
import { deleteRemoteReceiptPhoto, downloadReceiptPhoto, uploadReceiptPhoto } from "@/lib/receipts";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type OutboxOperation = "create" | "update" | "delete";
type SyncEntityType =
  | "book"
  | "account"
  | "category"
  | "tag"
  | "recurring_template"
  | "transaction";
type JsonValue = string | number | boolean | null;
type SyncRow = Record<string, JsonValue>;

interface OutboxEntry {
  id: number;
  entity_type: SyncEntityType | string;
  entity_id: string;
  operation: OutboxOperation;
  payload: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

interface SyncTableConfig {
  table: string;
  localTable: string;
  remoteColumns: string[];
  localColumns: string[];
  generatedRemoteColumns?: string[];
}

const SYNC_TABLES: Record<SyncEntityType, SyncTableConfig> = {
  book: {
    table: "books",
    localTable: "books",
    remoteColumns: ["id", "user_id", "slug", "name", "created_at"],
    localColumns: ["id", "slug", "name", "created_at"],
  },
  account: {
    table: "accounts",
    localTable: "accounts",
    remoteColumns: [
      "id",
      "user_id",
      "book_id",
      "name",
      "type",
      "initial_balance",
      "is_archived",
      "created_at",
    ],
    localColumns: ["id", "book_id", "name", "type", "initial_balance", "is_archived", "created_at"],
  },
  category: {
    table: "categories",
    localTable: "categories",
    remoteColumns: [
      "id",
      "user_id",
      "book_id",
      "parent_id",
      "name",
      "type",
      "is_archived",
      "sort_order",
      "created_at",
    ],
    localColumns: [
      "id",
      "book_id",
      "parent_id",
      "name",
      "type",
      "is_archived",
      "sort_order",
      "created_at",
    ],
  },
  tag: {
    table: "tags",
    localTable: "tags",
    remoteColumns: ["id", "user_id", "name", "description", "is_archived", "created_at"],
    localColumns: ["id", "name", "description", "is_archived", "created_at"],
  },
  recurring_template: {
    table: "recurring_templates",
    localTable: "recurring_templates",
    remoteColumns: [
      "id",
      "user_id",
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
    ],
    localColumns: [
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
    ],
  },
  transaction: {
    table: "transactions",
    localTable: "transactions",
    remoteColumns: [
      "id",
      "user_id",
      "date",
      "description",
      "book_id",
      "account_id",
      "category_id",
      "tag_id",
      "payment_method",
      "amount_gross",
      "vat_rate",
      "receipt_photo_path",
      "recurring_template_id",
      "notes",
      "created_at",
      "updated_at",
    ],
    localColumns: [
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
    ],
    generatedRemoteColumns: ["amount_vat", "amount_net"],
  },
};

const PUSH_REFERENCE_ORDER: SyncEntityType[] = [
  "book",
  "account",
  "category",
  "tag",
  "recurring_template",
];

const PULL_ORDER: SyncEntityType[] = [
  "book",
  "account",
  "category",
  "tag",
  "recurring_template",
  "transaction",
];

function isSyncEntityType(value: string): value is SyncEntityType {
  return value in SYNC_TABLES;
}

function parsePayload(payload: string): SyncRow {
  const parsed: unknown = JSON.parse(payload);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid outbox payload");
  }
  return parsed as SyncRow;
}

function syncErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === "object") {
    const fields = err as {
      code?: unknown;
      message?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const parts = [fields.code, fields.message, fields.details, fields.hint].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    if (parts.length > 0) {
      return parts.join(" · ");
    }

    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }

  return String(err);
}

function timestampValue(value: JsonValue | undefined): string | null {
  if (typeof value !== "string") return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function timestampMs(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function localUpdatedAt(row: SyncRow): string {
  return (
    timestampValue(row.local_updated_at) ??
    timestampValue(row.updated_at) ??
    timestampValue(row.created_at) ??
    now()
  );
}

function serverUpdatedAt(row: SyncRow): string {
  return timestampValue(row.updated_at) ?? now();
}

async function getRemoteUpdatedAt(table: string, entityId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .select("updated_at")
    .eq("id", entityId)
    .maybeSingle();

  if (error) throw error;

  const remote = data as { updated_at?: string | null } | null;
  return remote?.updated_at ?? null;
}

async function shouldSkipPull(config: SyncTableConfig, remoteRow: SyncRow): Promise<boolean> {
  const entityId = remoteRow.id;
  const remoteMs = timestampMs(serverUpdatedAt(remoteRow));

  if (typeof entityId !== "string" || remoteMs === null) return false;

  const db = await getDb();
  const localRows = await db.select<Array<{ local_updated_at: string }>>(
    `SELECT local_updated_at FROM ${config.localTable} WHERE id = ? LIMIT 1`,
    [entityId],
  );
  const localMs = timestampMs(localRows[0]?.local_updated_at ?? null);

  if (localMs !== null && localMs > remoteMs) {
    console.warn(`[sync] LWW: local newer for ${config.table} ${entityId}. Skipping pull.`);
    return true;
  }

  return false;
}

function toRemoteRow(entityType: SyncEntityType, row: SyncRow, userId: string): SyncRow {
  const config = SYNC_TABLES[entityType];
  const remoteRow: SyncRow = {};

  for (const column of config.remoteColumns) {
    if (column === "user_id") {
      remoteRow[column] = userId;
    } else if (row[column] !== undefined) {
      remoteRow[column] = toRemoteValue(column, row[column]);
    }
  }

  for (const generatedColumn of config.generatedRemoteColumns ?? []) {
    delete remoteRow[generatedColumn];
  }

  return remoteRow;
}

function toRemoteValue(column: string, value: JsonValue): JsonValue {
  if ((column === "is_archived" || column === "active") && typeof value === "number") {
    return value === 1;
  }
  return value;
}

async function prepareRemoteRowForPush(
  entityType: SyncEntityType,
  row: SyncRow,
  userId: string,
  entityId: string,
): Promise<SyncRow> {
  const remoteRow = toRemoteRow(entityType, row, userId);

  if (entityType !== "transaction") return remoteRow;

  const receiptPath = row.receipt_photo_path;
  if (typeof receiptPath === "string" && receiptPath.length > 0) {
    remoteRow.receipt_photo_path = await uploadReceiptPhoto(userId, entityId, receiptPath);
  } else if (receiptPath === null) {
    remoteRow.receipt_photo_path = null;
    await deleteRemoteReceiptPhoto(userId, entityId);
  }

  return remoteRow;
}

async function preparePulledRowForLocal(
  entityType: SyncEntityType,
  row: SyncRow,
): Promise<SyncRow> {
  if (entityType !== "transaction") return row;

  const receiptPath = row.receipt_photo_path;
  if (typeof receiptPath !== "string" || receiptPath.length === 0) return row;

  const localPath = await downloadReceiptPhoto(receiptPath, String(row.id));
  return {
    ...row,
    receipt_photo_path: localPath,
  };
}

function toLocalRow(entityType: SyncEntityType, row: SyncRow): SyncRow {
  const config = SYNC_TABLES[entityType];
  const localRow: SyncRow = {};

  for (const column of config.localColumns) {
    if (row[column] !== undefined) localRow[column] = toLocalValue(column, row[column]);
  }

  localRow.sync_status = "synced";
  const syncedAt = serverUpdatedAt(row);
  localRow.local_updated_at = syncedAt;
  localRow.server_updated_at = syncedAt;

  return localRow;
}

function toLocalValue(column: string, value: JsonValue): JsonValue {
  if ((column === "is_archived" || column === "active") && typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}

async function upsertLocal(entityType: SyncEntityType, row: SyncRow) {
  const config = SYNC_TABLES[entityType];
  const localRow = toLocalRow(entityType, row);
  const columns = Object.keys(localRow);
  const placeholders = columns.map(() => "?").join(", ");
  const updateAssignments = columns
    .filter((column) => column !== "id")
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  const values = columns.map((column) => localRow[column]);
  const db = await getDb();

  await db.execute(
    `INSERT INTO ${config.localTable} (${columns.join(", ")})
     VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updateAssignments}`,
    values,
  );
}

async function upsertLocalReferenceData(userId: string) {
  const db = await getDb();

  for (const entityType of PUSH_REFERENCE_ORDER) {
    const config = SYNC_TABLES[entityType];
    const rows = await db.select<SyncRow[]>(
      `SELECT * FROM ${config.localTable} WHERE sync_status = 'pending'`,
    );

    if (rows.length === 0) continue;

    for (const row of rows) {
      const entityId = row.id;
      if (typeof entityId !== "string") continue;

      const remoteUpdatedAt = await getRemoteUpdatedAt(config.table, entityId);
      const remoteMs = timestampMs(remoteUpdatedAt);
      const localMs = timestampMs(localUpdatedAt(row));

      if (remoteMs !== null && localMs !== null && remoteMs > localMs) {
        console.warn(
          `[sync] LWW: remote newer for ${entityType} ${entityId} ` +
            `(remote=${remoteUpdatedAt}, local=${localUpdatedAt(row)}). Skipping push.`,
        );
        await db.execute(
          `UPDATE ${config.localTable}
           SET sync_status = 'synced', server_updated_at = ?
           WHERE id = ?`,
          [remoteUpdatedAt, entityId],
        );
        continue;
      }

      const remoteRow = toRemoteRow(entityType, row, userId);
      const { error } = await supabase.from(config.table).upsert(remoteRow);

      if (error) throw error;

      await db.execute(
        `UPDATE ${config.localTable}
         SET sync_status = 'synced', server_updated_at = ?
         WHERE id = ?`,
        [now(), entityId],
      );
    }
  }
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM sync_outbox",
  );
  return rows[0]?.count ?? 0;
}

export async function resetSyncStateForFullPull(): Promise<void> {
  const db = await getDb();
  const ts = now();

  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('last_synced_at', ?, ?)`,
    ["1970-01-01T00:00:00.000Z", ts],
  );
}

/**
 * Push pending changes from the local outbox to Supabase.
 */
export async function pushChanges(): Promise<number> {
  const db = await getDb();
  const user = useAppStore.getState().user;
  if (!user) return 0;

  await upsertLocalReferenceData(user.id);

  const entries = await db.select<OutboxEntry[]>(
    "SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 50",
  );

  let success = 0;
  const failures: string[] = [];

  for (const entry of entries) {
    try {
      if (!isSyncEntityType(entry.entity_type)) {
        throw new Error(`Unknown entity type: ${entry.entity_type}`);
      }

      const config = SYNC_TABLES[entry.entity_type];

      if (entry.operation === "create" || entry.operation === "update") {
        const payload = parsePayload(entry.payload);
        const remoteUpdatedAt = await getRemoteUpdatedAt(config.table, entry.entity_id);
        const remoteMs = timestampMs(remoteUpdatedAt);
        const localMs = timestampMs(localUpdatedAt(payload));

        if (remoteMs !== null && localMs !== null && remoteMs > localMs) {
          console.warn(
            `[sync] LWW: remote newer for ${entry.entity_type} ${entry.entity_id} ` +
              `(remote=${remoteUpdatedAt}, local=${localUpdatedAt(payload)}). Skipping push.`,
          );
          await db.execute("DELETE FROM sync_outbox WHERE id = ?", [entry.id]);
          continue;
        }

        const remoteRow = await prepareRemoteRowForPush(
          entry.entity_type,
          payload,
          user.id,
          entry.entity_id,
        );
        const { error } = await supabase.from(config.table).upsert(remoteRow);
        if (error) throw error;
      } else if (entry.operation === "delete") {
        if (entry.entity_type === "transaction") {
          const payload = parsePayload(entry.payload);
          if (payload.receipt_photo_path) {
            await deleteRemoteReceiptPhoto(user.id, entry.entity_id);
          }
        }

        const { error } = await supabase.from(config.table).delete().eq("id", entry.entity_id);
        if (error) throw error;
      }

      await db.execute("DELETE FROM sync_outbox WHERE id = ?", [entry.id]);

      if (entry.operation !== "delete") {
        await db.execute(
          `UPDATE ${config.localTable}
           SET sync_status = 'synced', server_updated_at = ?
           WHERE id = ?`,
          [now(), entry.entity_id],
        );
      }

      success++;
    } catch (err) {
      const message = syncErrorMessage(err);
      await db.execute(
        "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
        [message, entry.id],
      );
      console.error(`Push failed for ${entry.entity_type} ${entry.entity_id}:`, err);
      failures.push(`${entry.entity_type} ${entry.entity_id}: ${message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Δεν συγχρονίστηκαν ${failures.length} εγγραφές. ${failures.join(" | ")}`);
  }

  return success;
}

/**
 * Pull remote changes since last_synced_at into local SQLite.
 */
export async function pullChanges(): Promise<number> {
  const db = await getDb();
  const user = useAppStore.getState().user;
  if (!user) return 0;

  const meta = await db.select<Array<{ value: string }>>(
    "SELECT value FROM sync_metadata WHERE key = 'last_synced_at' LIMIT 1",
  );
  const lastSync = meta[0]?.value || "1970-01-01T00:00:00.000Z";

  let total = 0;

  for (const entityType of PULL_ORDER) {
    const config = SYNC_TABLES[entityType];
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .gt("updated_at", lastSync)
      .eq("user_id", user.id);

    if (error) {
      console.error(`Pull failed for ${config.table}:`, error);
      continue;
    }

    for (const row of data ?? []) {
      const remoteRow = row as SyncRow;
      if (await shouldSkipPull(config, remoteRow)) continue;

      const localRow = await preparePulledRowForLocal(entityType, remoteRow);
      await upsertLocal(entityType, localRow);
      total++;
    }
  }

  const ts = now();
  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('last_synced_at', ?, ?)`,
    [ts, ts],
  );

  return total;
}

/**
 * Combined sync cycle: push local changes first, then pull remote changes.
 */
export async function syncAll(): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushChanges();
  const pulled = await pullChanges();
  return { pushed, pulled };
}
