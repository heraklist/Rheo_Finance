import { getDb, now, runInTransaction } from "@/lib/db";
import {
  deleteLocalReceiptPhoto,
  deleteRemoteReceiptPhoto,
  downloadReceiptPhoto,
  isLocalReceiptPath,
  uploadReceiptPhoto,
} from "@/lib/receipts";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { computeVat } from "@/lib/utils";

type OutboxOperation = "create" | "update" | "delete";
type SyncEntityType =
  | "book"
  | "account"
  | "category"
  | "tag"
  | "recurring_template"
  | "transaction"
  | "plan"
  | "plan_expense_item"
  | "plan_income_item"
  | "coverage_expense"
  | "coverage_income";
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

interface PreparedRemotePush {
  remoteRow: SyncRow;
  uploadedReceipt: boolean;
  receiptSyncError: string | null;
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
    remoteColumns: ["id", "user_id", "slug", "name", "created_at", "deleted_at"],
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
      "deleted_at",
    ],
    localColumns: [
      "id",
      "book_id",
      "name",
      "type",
      "initial_balance",
      "is_archived",
      "created_at",
    ],
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
      "deleted_at",
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
    remoteColumns: [
      "id",
      "user_id",
      "name",
      "description",
      "is_archived",
      "created_at",
      "deleted_at",
    ],
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
      "deleted_at",
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
      "deleted_at",
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
  plan: {
    table: "plan",
    localTable: "plan",
    remoteColumns: [
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
      "deleted_at",
    ],
    localColumns: [
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
    ],
  },
  plan_expense_item: {
    table: "plan_expense_item",
    localTable: "plan_expense_item",
    remoteColumns: [
      "id",
      "user_id",
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
      "deleted_at",
    ],
    localColumns: [
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
    ],
  },
  plan_income_item: {
    table: "plan_income_item",
    localTable: "plan_income_item",
    remoteColumns: [
      "id",
      "user_id",
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
      "deleted_at",
    ],
    localColumns: [
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
    ],
  },
  coverage_expense: {
    table: "coverage_expense",
    localTable: "coverage_expense",
    remoteColumns: [
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
      "deleted_at",
    ],
    localColumns: [
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
    ],
  },
  coverage_income: {
    table: "coverage_income",
    localTable: "coverage_income",
    remoteColumns: [
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
      "deleted_at",
    ],
    localColumns: [
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
    ],
  },
};

const PUSH_REFERENCE_ORDER: SyncEntityType[] = [
  "book",
  "account",
  "category",
  "tag",
  "recurring_template",
  "plan",
  "plan_expense_item",
  "plan_income_item",
  "coverage_expense",
  "coverage_income",
];

const PULL_ORDER: SyncEntityType[] = [
  "book",
  "account",
  "category",
  "tag",
  "recurring_template",
  "plan",
  "plan_expense_item",
  "plan_income_item",
  "transaction",
  "coverage_expense",
  "coverage_income",
];

const BOOLEAN_COLUMNS = new Set([
  "is_archived",
  "active",
  "include_in_forecast",
  "included",
  "paid",
  "received",
]);

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

function remoteUpdatedAtFromResult(data: unknown): string {
  const row = data as { updated_at?: string | null } | null;
  return timestampValue(row?.updated_at ?? undefined) ?? now();
}

async function upsertRemoteRow(config: SyncTableConfig, remoteRow: SyncRow): Promise<string> {
  const { data, error } = await supabase
    .from(config.table)
    .upsert(remoteRow)
    .select("updated_at")
    .single();

  if (error) throw error;
  return remoteUpdatedAtFromResult(data);
}

function laterTimestamp(current: string | null, candidate: string | null): string | null {
  const candidateMs = timestampMs(candidate);
  if (candidateMs === null) return current;

  const currentMs = timestampMs(current);
  if (currentMs === null || candidateMs > currentMs) return candidate;

  return current;
}

async function countRows(table: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<Array<{ count: number }>>(
    `SELECT COUNT(*) AS count FROM ${table}`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function isBaselineLocalDatabase(): Promise<boolean> {
  const db = await getDb();
  const [metaRows, outboxRows] = await Promise.all([
    db.select<Array<{ value: string }>>(
      "SELECT value FROM sync_metadata WHERE key = 'last_synced_at' LIMIT 1",
    ),
    db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM sync_outbox
       WHERE entity_type NOT IN ('book', 'account', 'category', 'tag')`,
    ),
  ]);

  const lastSync = metaRows[0]?.value ?? "1970-01-01T00:00:00.000Z";
  if (lastSync !== "" && lastSync !== "1970-01-01T00:00:00.000Z") return false;
  // Only block adoption for non-reference outbox entries (transactions, plans, etc.)
  if (Number(outboxRows[0]?.count ?? 0) > 0) return false;

  const userDataTables = [
    "transactions",
    "plan",
    "plan_expense_item",
    "plan_income_item",
    "coverage_expense",
    "coverage_income",
    "recurring_templates",
    "tags",
  ];

  for (const table of userDataTables) {
    if ((await countRows(table)) > 0) return false;
  }

  return true;
}

async function getRemoteRowCount(table: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

async function fetchAllRemoteRows(config: SyncTableConfig, userId: string): Promise<SyncRow[]> {
  const { data, error } = await supabase.from(config.table).select("*").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as SyncRow[];
}

async function adoptRemoteBaseline(userId: string): Promise<boolean> {
  if (!(await isBaselineLocalDatabase())) return false;

  let remoteRowCount = 0;
  for (const entityType of PULL_ORDER) {
    remoteRowCount += await getRemoteRowCount(SYNC_TABLES[entityType].table, userId);
  }
  if (remoteRowCount === 0) return false;

  const db = await getDb();
  const remoteRowsByEntity = new Map<SyncEntityType, SyncRow[]>();
  let highWatermark: string | null = null;

  for (const entityType of PULL_ORDER) {
    const rows = await fetchAllRemoteRows(SYNC_TABLES[entityType], userId);
    remoteRowsByEntity.set(entityType, rows);
    for (const row of rows) {
      highWatermark = laterTimestamp(highWatermark, timestampValue(row.updated_at));
    }
  }

  await runInTransaction(async (txDb) => {
    await txDb.execute("DELETE FROM sync_outbox");
    for (const entityType of [...PULL_ORDER].reverse()) {
      await txDb.execute(`DELETE FROM ${SYNC_TABLES[entityType].localTable}`);
    }
  });

  for (const entityType of PULL_ORDER) {
    for (const remoteRow of remoteRowsByEntity.get(entityType) ?? []) {
      await applyRemoteRowToLocal(entityType, remoteRow);
    }
  }

  const syncedAt = highWatermark ?? now();
  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('last_synced_at', ?, ?)`,
    [syncedAt, now()],
  );
  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('remote_seeded_at', ?, ?)`,
    [now(), now()],
  );

  console.error(`[sync] Adopted ${remoteRowCount} remote rows into empty local baseline.`);
  return true;
}

function localUpdatedAt(row: SyncRow): string | null {
  return timestampValue(row.local_updated_at);
}

function serverUpdatedAt(row: SyncRow): string | null {
  return timestampValue(row.updated_at) ?? timestampValue(row.server_updated_at);
}

function deletedAt(row: SyncRow): string | null {
  return timestampValue(row.deleted_at);
}

async function getRemoteUpdatedAt(table: string, id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .select("updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  const row = data as { updated_at?: string | null } | null;
  return timestampValue(row?.updated_at ?? undefined);
}

async function getRemoteRow(config: SyncTableConfig, entityId: string): Promise<SyncRow | null> {
  const { data, error } = await supabase
    .from(config.table)
    .select("*")
    .eq("id", entityId)
    .maybeSingle();

  if (error) throw error;
  return data ? (data as SyncRow) : null;
}

async function ensureDefaultBook(userId: string): Promise<SyncRow | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .eq("slug", "business")
    .maybeSingle();

  if (error) throw error;
  return data ? (data as SyncRow) : null;
}

async function ensureRemoteBaseline(userId: string): Promise<void> {
  if (await adoptRemoteBaseline(userId)) return;

  const db = await getDb();
  const alreadySeeded = await db.select<Array<{ value: string }>>(
    "SELECT value FROM sync_metadata WHERE key = 'remote_seeded_at' LIMIT 1",
  );
  if (alreadySeeded.length > 0) return;

  const remoteBook = await ensureDefaultBook(userId);
  const localBooks = await db.select<SyncRow[]>(
    "SELECT * FROM books WHERE slug = 'business' LIMIT 1",
  );

  if (remoteBook) {
    const remoteId = remoteBook.id;
    const localBook = localBooks[0];

    if (typeof remoteId === "string" && localBook && localBook.id !== remoteId) {
      await resolveBookIdConflict(String(localBook.id), "business", userId);
    }
  } else if (localBooks[0]) {
    const remoteRow = toRemoteRow("book", localBooks[0], userId);
    await upsertRemoteRow(SYNC_TABLES.book, remoteRow);
  }

  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('remote_seeded_at', ?, ?)`,
    [now(), now()],
  );
}

function toRemoteRow(entityType: SyncEntityType, row: SyncRow, userId: string): SyncRow {
  const config = SYNC_TABLES[entityType];
  const remoteRow: SyncRow = {};

  for (const column of config.remoteColumns) {
    if (column === "user_id") {
      remoteRow[column] = userId;
    } else if (column === "deleted_at") {
      remoteRow[column] =
        row[column] === undefined ? null : toRemoteValue(column, row[column]);
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
  if (BOOLEAN_COLUMNS.has(column) && typeof value === "number") {
    return value === 1;
  }
  return value;
}

async function hasLocalRow(table: string, id: JsonValue | undefined): Promise<boolean> {
  if (typeof id !== "string" || id.length === 0) return false;

  const db = await getDb();
  const rows = await db.select<Array<{ present: number }>>(
    `SELECT 1 AS present FROM ${table} WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows.length > 0;
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
    console.error(`[sync] LWW: local newer for ${config.table} ${entityId}. Skipping pull.`);
    return true;
  }

  return false;
}

async function prepareRemoteRowForPush(
  entityType: SyncEntityType,
  row: SyncRow,
  userId: string,
  entityId: string,
): Promise<PreparedRemotePush> {
  const remoteRow = toRemoteRow(entityType, row, userId);

  if (entityType !== "transaction") {
    return { remoteRow, uploadedReceipt: false, receiptSyncError: null };
  }

  const receiptPath = row.receipt_photo_path;
  if (typeof receiptPath === "string" && receiptPath.length > 0) {
    if (!isLocalReceiptPath(receiptPath)) {
      return { remoteRow, uploadedReceipt: false, receiptSyncError: null };
    }

    try {
      remoteRow.receipt_photo_path = await uploadReceiptPhoto(userId, entityId, receiptPath);
      return { remoteRow, uploadedReceipt: true, receiptSyncError: null };
    } catch (error) {
      const message = syncErrorMessage(error);
      console.error(`[sync] Receipt upload failed for transaction ${entityId}:`, error);
      remoteRow.receipt_photo_path = null;
      return {
        remoteRow,
        uploadedReceipt: false,
        receiptSyncError: `Receipt upload failed: ${message}`,
      };
    }
  }

  if (receiptPath === null) {
    remoteRow.receipt_photo_path = null;
    try {
      await deleteRemoteReceiptPhoto(userId, entityId);
    } catch (error) {
      const message = syncErrorMessage(error);
      console.error(`[sync] Receipt delete failed for transaction ${entityId}:`, error);
      return {
        remoteRow,
        uploadedReceipt: false,
        receiptSyncError: `Receipt delete failed: ${message}`,
      };
    }
  }

  return { remoteRow, uploadedReceipt: false, receiptSyncError: null };
}

async function markRemotePlanChildrenDeleted(
  planId: string,
  deletedAtValue: string,
): Promise<void> {
  for (const table of ["plan_expense_item", "plan_income_item"]) {
    const { error } = await supabase
      .from(table)
      .update({ deleted_at: deletedAtValue })
      .eq("plan_id", planId)
      .is("deleted_at", null);

    if (error) throw error;
  }
}

async function clearRemoteRecurringReferences(recurringTemplateId: string): Promise<void> {
  const updates = [
    supabase
      .from("transactions")
      .update({ recurring_template_id: null })
      .eq("recurring_template_id", recurringTemplateId)
      .is("deleted_at", null),
    supabase
      .from("coverage_expense")
      .update({ linked_recurring_id: null })
      .eq("linked_recurring_id", recurringTemplateId)
      .is("deleted_at", null),
    supabase
      .from("coverage_income")
      .update({ linked_recurring_id: null })
      .eq("linked_recurring_id", recurringTemplateId)
      .is("deleted_at", null),
  ];

  for (const update of updates) {
    const { error } = await update;
    if (error) throw error;
  }
}

async function clearRemoteTransactionCoverageLinks(transactionId: string): Promise<void> {
  const updates = [
    supabase
      .from("coverage_expense")
      .update({ linked_transaction_id: null })
      .eq("linked_transaction_id", transactionId)
      .is("deleted_at", null),
    supabase
      .from("coverage_income")
      .update({ linked_transaction_id: null })
      .eq("linked_transaction_id", transactionId)
      .is("deleted_at", null),
  ];

  for (const update of updates) {
    const { error } = await update;
    if (error) throw error;
  }
}

async function preparePulledRowForLocal(
  entityType: SyncEntityType,
  row: SyncRow,
): Promise<SyncRow | null> {
  let nextRow = row;

  if (entityType === "plan_expense_item" || entityType === "plan_income_item") {
    if (!(await hasLocalRow("plan", nextRow.plan_id))) {
      console.error(
        `[sync] Skipping orphan ${entityType} ${String(nextRow.id)}; missing plan ${String(
          nextRow.plan_id,
        )}.`,
      );
      return null;
    }
  }

  if (entityType === "plan_expense_item" && nextRow.account_id !== null) {
    if (!(await hasLocalRow("accounts", nextRow.account_id))) {
      nextRow = { ...nextRow, account_id: null };
    }
  }

  if (entityType === "transaction" && nextRow.recurring_template_id !== null) {
    if (!(await hasLocalRow("recurring_templates", nextRow.recurring_template_id))) {
      nextRow = { ...nextRow, recurring_template_id: null };
    }
  }

  if (entityType === "transaction") {
    const gross = typeof nextRow.amount_gross === "number" ? nextRow.amount_gross : null;
    const vatRate = typeof nextRow.vat_rate === "number" ? nextRow.vat_rate : null;

    if (
      gross !== null &&
      vatRate !== null &&
      (nextRow.amount_vat === undefined ||
        nextRow.amount_vat === null ||
        nextRow.amount_net === undefined ||
        nextRow.amount_net === null)
    ) {
      const { vat, net } = computeVat(gross, vatRate);
      nextRow = {
        ...nextRow,
        amount_vat: vat,
        amount_net: net,
      };
    }
  }

  if (entityType === "coverage_expense") {
    let sanitized = nextRow;

    if (sanitized.linked_recurring_id !== null) {
      if (!(await hasLocalRow("recurring_templates", sanitized.linked_recurring_id))) {
        sanitized = { ...sanitized, linked_recurring_id: null };
      }
    }

    if (sanitized.linked_transaction_id !== null) {
      if (!(await hasLocalRow("transactions", sanitized.linked_transaction_id))) {
        sanitized = { ...sanitized, linked_transaction_id: null };
      }
    }

    nextRow = sanitized;
  }

  if (entityType === "coverage_income") {
    if (
      nextRow.linked_recurring_id !== null &&
      !(await hasLocalRow("recurring_templates", nextRow.linked_recurring_id))
    ) {
      nextRow = { ...nextRow, linked_recurring_id: null };
    }
    if (
      nextRow.linked_transaction_id !== null &&
      !(await hasLocalRow("transactions", nextRow.linked_transaction_id))
    ) {
      nextRow = { ...nextRow, linked_transaction_id: null };
    }
  }

  if (entityType !== "transaction") return nextRow;

  const receiptPath = nextRow.receipt_photo_path;
  if (typeof receiptPath !== "string" || receiptPath.length === 0) return nextRow;

  const localPath = await downloadReceiptPhoto(receiptPath, String(nextRow.id));
  return {
    ...nextRow,
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
  if (BOOLEAN_COLUMNS.has(column) && typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}

async function upsertLocal(entityType: SyncEntityType, row: SyncRow) {
  const config = SYNC_TABLES[entityType];
  const localRow = toLocalRow(entityType, row);
  const columns = Object.keys(localRow);
  const placeholders = columns.map(() => "?").join(", ");
  const quoted = columns.map((column) => `"${column}"`);
  const updateAssignments = columns
    .filter((column) => column !== "id")
    .map((column) => `"${column}" = excluded."${column}"`)
    .join(", ");
  const values = columns.map((column) => localRow[column]);
  const db = await getDb();

  await db.execute(
    `INSERT INTO ${config.localTable} (${quoted.join(", ")})
     VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updateAssignments}`,
    values,
  );
}

async function deleteLocalForRemoteTombstone(
  entityType: SyncEntityType,
  remoteRow: SyncRow,
): Promise<void> {
  const entityId = remoteRow.id;
  if (typeof entityId !== "string") return;

  const config = SYNC_TABLES[entityType];
  const db = await getDb();

  if (entityType === "transaction") {
    const localRows = await db.select<Array<{ receipt_photo_path: string | null }>>(
      "SELECT receipt_photo_path FROM transactions WHERE id = ? LIMIT 1",
      [entityId],
    );
    await db.execute(
      `UPDATE coverage_expense
       SET linked_transaction_id = NULL
       WHERE linked_transaction_id = ?`,
      [entityId],
    );
    await db.execute(
      `UPDATE coverage_income
       SET linked_transaction_id = NULL
       WHERE linked_transaction_id = ?`,
      [entityId],
    );
    await db.execute("DELETE FROM transactions WHERE id = ?", [entityId]);
    await deleteLocalReceiptPhoto(localRows[0]?.receipt_photo_path);
    return;
  }

  if (entityType === "recurring_template") {
    await db.execute(
      `UPDATE transactions
       SET recurring_template_id = NULL
       WHERE recurring_template_id = ?`,
      [entityId],
    );
    await db.execute(
      `UPDATE coverage_expense
       SET linked_recurring_id = NULL
       WHERE linked_recurring_id = ?`,
      [entityId],
    );
    await db.execute(
      `UPDATE coverage_income
       SET linked_recurring_id = NULL
       WHERE linked_recurring_id = ?`,
      [entityId],
    );
  }

  await db.execute(`DELETE FROM ${config.localTable} WHERE id = ?`, [entityId]);
}

async function applyRemoteRowToLocal(
  entityType: SyncEntityType,
  remoteRow: SyncRow,
): Promise<boolean> {
  if (deletedAt(remoteRow)) {
    await deleteLocalForRemoteTombstone(entityType, remoteRow);
    return true;
  }

  const localRow = await preparePulledRowForLocal(entityType, remoteRow);
  if (localRow === null) return false;

  await upsertLocal(entityType, localRow);
  return true;
}

// ---------------------------------------------------------------------------
// Book ID conflict resolution — handles UNIQUE (user_id, slug) violations
// ---------------------------------------------------------------------------

/** Tables that hold a book_id FK and need remapping when local book ID differs from remote. */
const BOOK_FK_TABLES = [
  "accounts",
  "categories",
  "recurring_templates",
  "transactions",
  "plan",
  "coverage_expense",
  "coverage_income",
] as const;

function isUniqueViolation(err: unknown): boolean {
  const msg = syncErrorMessage(err).toLowerCase();
  return msg.includes("unique") || msg.includes("duplicate key") || msg.includes("23505");
}

/**
 * When pushing a local book fails because Supabase already has a book with the
 * same (user_id, slug) but a different PK, we adopt the remote ID:
 * 1. Fetch the remote book by slug
 * 2. Remap every local FK reference from oldId → remoteId
 * 3. Update the local book row's own ID
 * 4. Remap any outbox entries referencing the old ID
 */
async function resolveBookIdConflict(
  localBookId: string,
  slug: JsonValue,
  userId: string,
): Promise<boolean> {
  if (typeof slug !== "string") return false;

  // Find the existing remote book by (user_id, slug)
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return false;

  const remoteId = (data as SyncRow).id;
  if (typeof remoteId !== "string" || remoteId === localBookId) return false;

  const ts = now();

  await runInTransaction(async (txDb) => {
    // Defer FK enforcement to COMMIT time for this ID swap. NOTE: `PRAGMA
    // foreign_keys = OFF/ON` is a NO-OP inside an active transaction (SQLite
    // only honors it outside a transaction), so the previous approach left
    // enforcement ON and the child remaps below failed with
    // "FOREIGN KEY constraint failed". `defer_foreign_keys` DOES take effect
    // inside a transaction and automatically resets at COMMIT/ROLLBACK.
    await txDb.execute("PRAGMA defer_foreign_keys = ON");

    // Remap all child tables
    for (const table of BOOK_FK_TABLES) {
      await txDb.execute(`UPDATE ${table} SET book_id = ? WHERE book_id = ?`, [
        remoteId,
        localBookId,
      ]);
    }

    // Remap outbox payload references
    await txDb.execute(
      `UPDATE sync_outbox
       SET payload = json_set(payload, '$.book_id', ?)
       WHERE json_extract(payload, '$.book_id') = ?`,
      [remoteId, localBookId],
    );

    // Update outbox entity_id for the book itself
    await txDb.execute(
      `UPDATE sync_outbox SET entity_id = ? WHERE entity_type = 'book' AND entity_id = ?`,
      [remoteId, localBookId],
    );

    // Update the book row's own ID
    await txDb.execute("UPDATE books SET id = ? WHERE id = ?", [remoteId, localBookId]);

    // Mark it synced with the remote timestamp
    const remoteUpdatedAt = timestampValue((data as SyncRow).updated_at) ?? ts;
    await txDb.execute(
      `UPDATE books
       SET sync_status = 'synced',
           local_updated_at = ?,
           server_updated_at = ?
       WHERE id = ?`,
      [remoteUpdatedAt, remoteUpdatedAt, remoteId],
    );

    const violations = await txDb.select<unknown[]>("PRAGMA foreign_key_check");
    if (violations.length > 0) {
      throw new Error(`FK violations after book remap: ${JSON.stringify(violations)}`);
    }
  });

  return true;
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

      try {
        const remoteUpdatedAt = await getRemoteUpdatedAt(config.table, entityId);
        const remoteMs = timestampMs(remoteUpdatedAt);
        const localMs = timestampMs(localUpdatedAt(row));

        if (remoteMs !== null && localMs !== null && remoteMs > localMs) {
          console.error(
            `[sync] LWW: remote newer for ${entityType} ${entityId} ` +
              `(remote=${remoteUpdatedAt}, local=${localUpdatedAt(row)}). Skipping push.`,
          );
          const remoteRow = await getRemoteRow(config, entityId);
          if (remoteRow) await applyRemoteRowToLocal(entityType, remoteRow);
          continue;
        }

        const remoteRow = toRemoteRow(entityType, row, userId);
        const syncedAt = await upsertRemoteRow(config, remoteRow);

        await db.execute(
          `UPDATE ${config.localTable}
           SET sync_status = 'synced',
               local_updated_at = ?,
               server_updated_at = ?
           WHERE id = ?`,
          [syncedAt, syncedAt, entityId],
        );
      } catch (err) {
        if (entityType === "book" && isUniqueViolation(err)) {
          const resolved = await resolveBookIdConflict(entityId, row.slug ?? null, userId);
          if (resolved) {
            console.error(
              `[sync] Resolved book ID conflict for slug="${String(row.slug)}" ` +
                `(local=${entityId} → adopted remote ID)`,
            );
            continue;
          }
        }
        // Log but don't throw — let other entities sync
        console.error(`[sync] Failed to push ${entityType} ${entityId}:`, syncErrorMessage(err));
      }
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

  await ensureRemoteBaseline(user.id);
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
      let syncedAt: string | null = null;
      let receiptSyncError: string | null = null;

      if (entry.operation === "create" || entry.operation === "update") {
        const payload = parsePayload(entry.payload);
        const remoteUpdatedAt = await getRemoteUpdatedAt(config.table, entry.entity_id);
        const remoteMs = timestampMs(remoteUpdatedAt);
        const localMs = timestampMs(localUpdatedAt(payload));

        if (remoteMs !== null && localMs !== null && remoteMs > localMs) {
          console.error(
            `[sync] LWW: remote newer for ${entry.entity_type} ${entry.entity_id} ` +
              `(remote=${remoteUpdatedAt}, local=${localUpdatedAt(payload)}). Skipping push.`,
          );
          const remoteRow = await getRemoteRow(config, entry.entity_id);
          if (remoteRow) await applyRemoteRowToLocal(entry.entity_type, remoteRow);
          await db.execute("DELETE FROM sync_outbox WHERE id = ?", [entry.id]);
          success++;
          continue;
        }

        const prepared = await prepareRemoteRowForPush(
          entry.entity_type,
          payload,
          user.id,
          entry.entity_id,
        );
        receiptSyncError = prepared.receiptSyncError;
        try {
          syncedAt = await upsertRemoteRow(config, prepared.remoteRow);
        } catch (error) {
          if (
            entry.operation === "create" &&
            entry.entity_type === "transaction" &&
            prepared.uploadedReceipt
          ) {
            try {
              await deleteRemoteReceiptPhoto(user.id, entry.entity_id);
            } catch (cleanupError) {
              console.error(
                "Failed to clean up uploaded receipt after push failure:",
                cleanupError,
              );
            }
          }
          throw error;
        }
      } else if (entry.operation === "delete") {
        const payload = parsePayload(entry.payload);
        const localDeletedAt = deletedAt(payload) ?? timestampValue(entry.created_at) ?? now();
        const remoteUpdatedAt = await getRemoteUpdatedAt(config.table, entry.entity_id);
        const remoteMs = timestampMs(remoteUpdatedAt);
        const localMs = timestampMs(localDeletedAt);

        if (remoteMs !== null && localMs !== null && remoteMs > localMs) {
          console.error(
            `[sync] LWW: remote newer for deleted ${entry.entity_type} ${entry.entity_id} ` +
              `(remote=${remoteUpdatedAt}, local=${localDeletedAt}). Skipping delete.`,
          );
          const remoteRow = await getRemoteRow(config, entry.entity_id);
          if (remoteRow) await applyRemoteRowToLocal(entry.entity_type, remoteRow);
          await db.execute("DELETE FROM sync_outbox WHERE id = ?", [entry.id]);
          success++;
          continue;
        }

        const { data, error } = await supabase
          .from(config.table)
          .update({ deleted_at: localDeletedAt })
          .eq("id", entry.entity_id)
          .select("updated_at")
          .maybeSingle();
        if (error) throw error;
        syncedAt = data ? remoteUpdatedAtFromResult(data) : localDeletedAt;

        if (entry.entity_type === "plan") {
          await markRemotePlanChildrenDeleted(entry.entity_id, localDeletedAt);
        } else if (entry.entity_type === "recurring_template") {
          await clearRemoteRecurringReferences(entry.entity_id);
        } else if (entry.entity_type === "transaction") {
          await clearRemoteTransactionCoverageLinks(entry.entity_id);
        }

        if (entry.entity_type === "transaction" && payload.receipt_photo_path) {
          try {
            await deleteRemoteReceiptPhoto(user.id, entry.entity_id);
          } catch (error) {
            console.error(
              `[sync] Receipt delete failed for transaction ${entry.entity_id}:`,
              error,
            );
          }
        }
      }

      await runInTransaction(async (txDb) => {
        if (entry.operation !== "delete") {
          const finalSyncedAt = syncedAt ?? now();
          await txDb.execute(
            `UPDATE ${config.localTable}
             SET sync_status = 'synced',
                 local_updated_at = ?,
                 server_updated_at = ?
             WHERE id = ?`,
            [finalSyncedAt, finalSyncedAt, entry.entity_id],
          );
        }

        if (receiptSyncError) {
          await txDb.execute(
            "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
            [receiptSyncError, entry.id],
          );
        } else {
          await txDb.execute("DELETE FROM sync_outbox WHERE id = ?", [entry.id]);
        }
      });

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
  let highWatermark: string | null = null;
  const failures: string[] = [];

  for (const entityType of PULL_ORDER) {
    const config = SYNC_TABLES[entityType];
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .gt("updated_at", lastSync)
      .eq("user_id", user.id);

    if (error) {
      console.error(`Pull failed for ${config.table}:`, error);
      failures.push(`${config.table}: ${syncErrorMessage(error)}`);
      continue;
    }

    for (const row of data ?? []) {
      const remoteRow = row as SyncRow;

      try {
        // Defense-in-depth: verify pulled row belongs to the authenticated user.
        // This guards against Supabase RLS misconfiguration leaking other users' data.
        if (remoteRow.user_id !== undefined && remoteRow.user_id !== user.id) {
          console.error(
            `[sync] Pull rejected: row ${config.table}.${String(remoteRow.id)} belongs to another user.`,
          );
          continue;
        }

        const remoteUpdatedAt = timestampValue(remoteRow.updated_at);

        if (await shouldSkipPull(config, remoteRow)) {
          highWatermark = laterTimestamp(highWatermark, remoteUpdatedAt);
          continue;
        }

        if (await applyRemoteRowToLocal(entityType, remoteRow)) {
          total++;
          highWatermark = laterTimestamp(highWatermark, remoteUpdatedAt);
        }
      } catch (rowError) {
        console.error(`[sync] Pull failed for ${config.table}.${String(remoteRow.id)}:`, rowError);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`Δεν ολοκληρώθηκε το pull. ${failures.join(" | ")}`);
  }

  if (highWatermark !== null) {
    await db.execute(
      `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
       VALUES ('last_synced_at', ?, ?)`,
      [highWatermark, now()],
    );
  }

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
