import { getDb } from "@/lib/db";
import { computeNextDue } from "@/lib/recurring";
import { BOOK_SLUG_BUSINESS } from "@/lib/types";
import type { TransactionWithRelations } from "@/lib/types";

// === Review Queue Types ===

export type ReviewGroupTone = "high" | "medium" | "low";

export interface ReviewItem {
  id: string;
  label: string;
  meta: string;
  action: string;
  entityId?: string;
  entityType?: "transaction" | "recurring";
}

export interface ReviewGroup {
  key: string;
  title: string;
  tone: ReviewGroupTone;
  items: ReviewItem[];
}

// === Helpers ===

function todayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function daysDiff(isoDate: string): number {
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// === Group builders ===

/**
 * Transactions in categories with generic names that might need re-categorization.
 * In practice: transactions whose category was auto-assigned or is a catch-all.
 * We look for the "Γενικά" or "Λοιπά" categories, or transactions with no category.
 */
async function getUncategorizedItems(): Promise<ReviewItem[]> {
  const db = await getDb();
  const rows = await db.select<TransactionWithRelations[]>(
    `SELECT t.*, c.name AS category_name, c.type AS category_type
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE c.name IN ('Γενικά', 'Λοιπά', 'Γενικά Έξοδα', 'Λοιπά Έξοδα', 'Λοιπά Έσοδα')
        OR c.id IS NULL
     ORDER BY t.date DESC
     LIMIT 20`,
  );

  return rows.map((tx) => ({
    id: `uncategorized-${tx.id}`,
    label: tx.description,
    meta: `${formatAmount(tx.amount_gross)} · ${tx.date}`,
    action: tx.category_name ? `Κατηγορία: ${tx.category_name}` : "Χρειάζεται κατηγορία",
    entityId: tx.id,
    entityType: "transaction",
  }));
}

/**
 * Business transactions (expense) without a receipt photo attached.
 * Only checks recent transactions (last 90 days).
 */
async function getMissingReceiptItems(): Promise<ReviewItem[]> {
  const db = await getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const rows = await db.select<TransactionWithRelations[]>(
    `SELECT t.*, c.name AS category_name, c.type AS category_type
     FROM transactions t
     JOIN categories c ON t.category_id = c.id
     JOIN books b ON t.book_id = b.id
     WHERE b.slug = ?
       AND c.type = 'expense'
       AND t.receipt_photo_path IS NULL
       AND t.date >= ?
     ORDER BY t.date DESC
     LIMIT 20`,
    [BOOK_SLUG_BUSINESS, cutoffIso],
  );

  return rows.map((tx) => ({
    id: `receipt-${tx.id}`,
    label: tx.description,
    meta: `${formatAmount(tx.amount_gross)} · ${tx.date}`,
    action: "Προσθήκη αρχείου",
    entityId: tx.id,
    entityType: "transaction",
  }));
}

/**
 * Possible duplicates: transactions with same amount on the same day.
 */
async function getDuplicateItems(): Promise<ReviewItem[]> {
  const db = await getDb();
  const rows = await db.select<
    Array<{ date: string; amount_gross: number; description: string; dup_count: number }>
  >(
    `SELECT t.date, t.amount_gross, MIN(t.description) AS description, COUNT(*) AS dup_count
     FROM transactions t
     GROUP BY t.date, t.amount_gross
     HAVING COUNT(*) > 1
     ORDER BY t.date DESC
     LIMIT 10`,
  );

  return rows.map((row, i) => ({
    id: `duplicate-${i}`,
    label: row.description,
    meta: `${row.dup_count} παρόμοιες εγγραφές · ${row.date}`,
    action: "Έλεγχος αντιστοίχισης",
  }));
}

/**
 * Active recurring templates whose next_due is overdue (before today).
 */
async function getOverdueItems(): Promise<ReviewItem[]> {
  const db = await getDb();
  const today = todayIso();

  interface RecurringRow {
    id: string;
    description: string;
    amount_gross: number;
    frequency: string;
    day_of_period: number;
    start_date: string;
    end_date: string | null;
    last_generated: string | null;
    active: boolean | number;
  }

  const rows = await db.select<RecurringRow[]>(
    `SELECT id, description, amount_gross, frequency, day_of_period,
            start_date, end_date, last_generated, active
     FROM recurring_templates
     WHERE active = 1`,
  );

  const items: ReviewItem[] = [];

  for (const row of rows) {
    const nextDue = computeNextDue({
      active: row.active === 1 || row.active === true,
      frequency: row.frequency as "monthly" | "weekly" | "quarterly" | "yearly",
      day_of_period: row.day_of_period,
      start_date: row.start_date,
      end_date: row.end_date,
      last_generated: row.last_generated,
    });

    if (nextDue && nextDue < today) {
      const diff = Math.abs(daysDiff(nextDue));
      items.push({
        id: `overdue-${row.id}`,
        label: row.description,
        meta: `${formatAmount(row.amount_gross)} · ${diff} ημέρες καθυστέρηση`,
        action: "Έλεγχος πληρωμής",
        entityId: row.id,
        entityType: "recurring",
      });
    }
  }

  return items.slice(0, 10);
}

/**
 * Pending sync outbox items.
 */
async function getSyncIssueItems(): Promise<ReviewItem[]> {
  const db = await getDb();
  const rows = await db.select<
    Array<{ entity_type: string; entity_id: string; operation: string; created_at: string }>
  >(
    `SELECT entity_type, entity_id, operation, created_at
     FROM sync_outbox
     ORDER BY created_at DESC
     LIMIT 10`,
  );

  if (rows.length === 0) return [];

  return [
    {
      id: "sync-pending",
      label: `${rows.length} εκκρεμείς εγγραφές`,
      meta: `Τελευταία: ${rows[0]?.created_at?.slice(0, 10) ?? "—"}`,
      action: "Έλεγχος συγχρονισμού",
    },
  ];
}

// === Main entry point ===

/**
 * Build all review groups by scanning local data.
 * This is a runtime computation — no new DB tables needed.
 */
export async function buildReviewGroups(): Promise<ReviewGroup[]> {
  const [uncategorized, missingReceipts, duplicates, overdue, syncIssues] = await Promise.all([
    getUncategorizedItems(),
    getMissingReceiptItems(),
    getDuplicateItems(),
    getOverdueItems(),
    getSyncIssueItems(),
  ]);

  const groups: ReviewGroup[] = [
    {
      key: "uncategorized",
      title: "Ακατηγοριοποίητες συναλλαγές",
      tone: uncategorized.length > 3 ? "high" : uncategorized.length > 0 ? "medium" : "low",
      items: uncategorized,
    },
    {
      key: "receipts",
      title: "Λείπουν αποδείξεις",
      tone: "low",
      items: missingReceipts,
    },
    {
      key: "duplicates",
      title: "Πιθανά διπλότυπα",
      tone: duplicates.length > 0 ? "medium" : "low",
      items: duplicates,
    },
    {
      key: "overdue",
      title: "Εκκρεμείς πληρωμές",
      tone: overdue.length > 0 ? "high" : "low",
      items: overdue,
    },
    {
      key: "sync",
      title: "Θέματα συγχρονισμού",
      tone: syncIssues.length > 0 ? "medium" : "low",
      items: syncIssues,
    },
  ];

  return groups;
}

/**
 * Quick total count for the attention badge on Dashboard.
 */
export async function getReviewItemCount(): Promise<number> {
  const groups = await buildReviewGroups();
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}
