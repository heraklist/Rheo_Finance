import { getDb, now, uuid } from "@/lib/db";
import { deleteLocalReceiptPhoto, saveReceiptPhotoForTransaction } from "@/lib/receipts";
import type { PaymentMethod, Transaction, TransactionWithRelations } from "@/lib/types";
import { computeVat } from "@/lib/utils";

// === READ ===

const TRANSACTION_SELECT = `SELECT
       t.*,
       b.name AS book_name,
       a.name AS account_name,
       c.name AS category_name,
       c.type AS category_type,
       tg.name AS tag_name
     FROM transactions t
     LEFT JOIN books b ON t.book_id = b.id
     LEFT JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN tags tg ON t.tag_id = tg.id`;

/**
 * List transactions with joined display fields, ordered by date desc.
 */
export async function listTransactions(
  opts: {
    bookId?: string;
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
    search?: string;
    categoryId?: string;
    minAmount?: number;
    maxAmount?: number;
  } = {},
): Promise<TransactionWithRelations[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.bookId) {
    conditions.push("t.book_id = ?");
    params.push(opts.bookId);
  }
  if (opts.fromDate) {
    conditions.push("t.date >= ?");
    params.push(opts.fromDate);
  }
  if (opts.toDate) {
    conditions.push("t.date <= ?");
    params.push(opts.toDate);
  }
  if (opts.categoryId) {
    conditions.push("t.category_id = ?");
    params.push(opts.categoryId);
  }
  if (opts.minAmount !== undefined) {
    conditions.push("t.amount_gross >= ?");
    params.push(opts.minAmount);
  }
  if (opts.maxAmount !== undefined) {
    conditions.push("t.amount_gross <= ?");
    params.push(opts.maxAmount);
  }
  if (opts.search?.trim()) {
    const q = `%${opts.search.trim().toLowerCase()}%`;
    conditions.push(
      "(LOWER(t.description) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(tg.name) LIKE ?)",
    );
    params.push(q, q, q);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;

  const rows = await db.select<TransactionWithRelations[]>(
    `${TRANSACTION_SELECT}
     ${whereClause}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  return rows;
}

/**
 * Load one transaction with joined display fields.
 */
export async function getTransaction(id: string): Promise<TransactionWithRelations | null> {
  const db = await getDb();
  const rows = await db.select<TransactionWithRelations[]>(
    `${TRANSACTION_SELECT}
     WHERE t.id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ?? null;
}

/**
 * Get totals for a given date range and book.
 * Returns total income, total expense, net.
 */
export async function getTotals(opts: {
  bookId?: string;
  fromDate: string;
  toDate: string;
}) {
  const db = await getDb();
  const conditions: string[] = ["date >= ?", "date <= ?"];
  const params: (string | number)[] = [opts.fromDate, opts.toDate];

  if (opts.bookId) {
    conditions.push("book_id = ?");
    params.push(opts.bookId);
  }

  const rows = await db.select<
    Array<{ category_type: string; total_gross: number; total_vat: number }>
  >(
    `SELECT c.type AS category_type,
            SUM(t.amount_gross) AS total_gross,
            SUM(t.amount_vat) AS total_vat
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     WHERE ${conditions.join(" AND ")}
     GROUP BY c.type`,
    params,
  );

  const totals = {
    income: 0,
    expense: 0,
    net: 0,
    vat_output: 0,
    vat_input: 0,
    vat_net: 0,
  };

  for (const r of rows) {
    if (r.category_type === "income") {
      totals.income = r.total_gross || 0;
      totals.vat_output = r.total_vat || 0;
    } else if (r.category_type === "expense") {
      totals.expense = r.total_gross || 0;
      totals.vat_input = r.total_vat || 0;
    }
  }
  totals.net = totals.income - totals.expense;
  totals.vat_net = totals.vat_output - totals.vat_input;
  return totals;
}

// === WRITE ===

export interface NewTransactionInput {
  date: string;
  description: string;
  book_id: string;
  account_id: string;
  category_id: string;
  tag_id?: string | null;
  payment_method: PaymentMethod;
  amount_gross: number;
  vat_rate: number;
  receipt_photo_path?: string | null;
  receipt_photo_bytes?: Uint8Array | null;
  remove_receipt_photo?: boolean;
  recurring_template_id?: string | null;
  notes?: string | null;
}

export interface UpdateTransactionInput extends NewTransactionInput {
  id: string;
}

/**
 * Create a new transaction. Computes VAT amount + net automatically.
 * Adds outbox entry for sync (when sync layer is wired up).
 */
export async function createTransaction(input: NewTransactionInput): Promise<Transaction> {
  const db = await getDb();
  const id = uuid();
  const ts = now();
  const { vat: amount_vat, net: amount_net } = computeVat(input.amount_gross, input.vat_rate);
  const receiptPhotoPath = input.receipt_photo_bytes
    ? await saveReceiptPhotoForTransaction(id, input.receipt_photo_bytes)
    : (input.receipt_photo_path ?? null);

  const tx: Transaction = {
    id,
    date: input.date,
    description: input.description,
    book_id: input.book_id,
    account_id: input.account_id,
    category_id: input.category_id,
    tag_id: input.tag_id ?? null,
    payment_method: input.payment_method,
    amount_gross: input.amount_gross,
    vat_rate: input.vat_rate,
    amount_vat,
    amount_net,
    receipt_photo_path: receiptPhotoPath,
    recurring_template_id: input.recurring_template_id ?? null,
    notes: input.notes ?? null,
    created_at: ts,
    updated_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await db.execute(
    `INSERT INTO transactions
       (id, date, description, book_id, account_id, category_id, tag_id,
        payment_method, amount_gross, vat_rate, amount_vat, amount_net,
        receipt_photo_path, recurring_template_id, notes,
        created_at, updated_at, sync_status, local_updated_at, server_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.date,
      tx.description,
      tx.book_id,
      tx.account_id,
      tx.category_id,
      tx.tag_id,
      tx.payment_method,
      tx.amount_gross,
      tx.vat_rate,
      tx.amount_vat,
      tx.amount_net,
      tx.receipt_photo_path,
      tx.recurring_template_id,
      tx.notes,
      tx.created_at,
      tx.updated_at,
      tx.sync_status,
      tx.local_updated_at,
      tx.server_updated_at,
    ],
  );

  // Add outbox entry for sync (Phase 2 will read these)
  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["transaction", tx.id, "create", JSON.stringify(tx), ts],
  );

  return tx;
}

/**
 * Update an existing transaction. Recomputes VAT and queues an outbox update.
 */
export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  const db = await getDb();
  const existing = await getTransaction(input.id);

  if (!existing) {
    throw new Error("Transaction not found");
  }

  const ts = now();
  const { vat: amount_vat, net: amount_net } = computeVat(input.amount_gross, input.vat_rate);
  let receiptPhotoPath = existing.receipt_photo_path;

  if (input.remove_receipt_photo) {
    await deleteLocalReceiptPhoto(existing.receipt_photo_path);
    receiptPhotoPath = null;
  } else if (input.receipt_photo_bytes) {
    receiptPhotoPath = await saveReceiptPhotoForTransaction(input.id, input.receipt_photo_bytes);
  } else if (input.receipt_photo_path !== undefined) {
    receiptPhotoPath = input.receipt_photo_path;
  }

  const tx: Transaction = {
    id: input.id,
    date: input.date,
    description: input.description,
    book_id: input.book_id,
    account_id: input.account_id,
    category_id: input.category_id,
    tag_id: input.tag_id ?? null,
    payment_method: input.payment_method,
    amount_gross: input.amount_gross,
    vat_rate: input.vat_rate,
    amount_vat,
    amount_net,
    receipt_photo_path: receiptPhotoPath,
    recurring_template_id: existing.recurring_template_id,
    notes: input.notes ?? null,
    created_at: existing.created_at,
    updated_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await db.execute(
    `UPDATE transactions
     SET date = ?,
         description = ?,
         book_id = ?,
         account_id = ?,
         category_id = ?,
         tag_id = ?,
         payment_method = ?,
         amount_gross = ?,
         vat_rate = ?,
         amount_vat = ?,
         amount_net = ?,
         receipt_photo_path = ?,
         notes = ?,
         updated_at = ?,
         sync_status = ?,
         local_updated_at = ?,
         server_updated_at = ?
     WHERE id = ?`,
    [
      tx.date,
      tx.description,
      tx.book_id,
      tx.account_id,
      tx.category_id,
      tx.tag_id,
      tx.payment_method,
      tx.amount_gross,
      tx.vat_rate,
      tx.amount_vat,
      tx.amount_net,
      tx.receipt_photo_path,
      tx.notes,
      tx.updated_at,
      tx.sync_status,
      tx.local_updated_at,
      tx.server_updated_at,
      tx.id,
    ],
  );

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["transaction", tx.id, "update", JSON.stringify(tx), ts],
  );

  return tx;
}

/**
 * Delete a transaction and queue an outbox delete.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  const existing = await getTransaction(id);

  if (!existing) {
    throw new Error("Transaction not found");
  }

  const ts = now();

  await db.execute("DELETE FROM transactions WHERE id = ?", [id]);

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      "transaction",
      id,
      "delete",
      JSON.stringify({
        ...existing,
        deleted_at: ts,
      }),
      ts,
    ],
  );

  try {
    await deleteLocalReceiptPhoto(existing.receipt_photo_path);
  } catch (err) {
    console.error("Failed to delete local receipt photo:", err);
  }
}
