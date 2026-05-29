import { enqueueOutbox, getDb, now, runInTransaction, uuid } from "@/lib/db";
import type { Account, Book, Category, CategoryType, Tag } from "@/lib/types";

export type EditableCategoryType = Extract<CategoryType, "income" | "expense">;

export interface CategoryUsage {
  transactions: number;
  recurringTemplates: number;
  childCategories: number;
  total: number;
}

type CountRow = { count: number };

export async function listBooks(): Promise<Book[]> {
  const db = await getDb();
  return db.select<Book[]>("SELECT * FROM books ORDER BY slug");
}

export async function listAccounts(bookId?: string): Promise<Account[]> {
  const db = await getDb();
  if (bookId) {
    return db.select<Account[]>(
      "SELECT * FROM accounts WHERE book_id = ? AND is_archived = 0 ORDER BY type, name",
      [bookId],
    );
  }
  return db.select<Account[]>(
    "SELECT * FROM accounts WHERE is_archived = 0 ORDER BY book_id, type, name",
  );
}

export async function listCategories(
  opts: {
    bookId?: string;
    type?: "income" | "expense" | "reserve" | "transfer";
    includeArchived?: boolean;
  } = {},
): Promise<Category[]> {
  const db = await getDb();
  const conditions: string[] = opts.includeArchived ? [] : ["is_archived = 0"];
  const params: string[] = [];

  if (opts.bookId) {
    conditions.push("book_id = ?");
    params.push(opts.bookId);
  }
  if (opts.type) {
    conditions.push("type = ?");
    params.push(opts.type);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return db.select<Category[]>(
    `SELECT * FROM categories ${whereClause}
     ORDER BY sort_order, name`,
    params,
  );
}

export async function listCategoryCounts(
  bookId: string,
): Promise<Record<EditableCategoryType, number>> {
  const db = await getDb();
  const rows = await db.select<Array<{ type: EditableCategoryType; count: number }>>(
    `SELECT type, COUNT(*) AS count
     FROM categories
     WHERE book_id = ? AND is_archived = 0 AND type IN ('income', 'expense')
     GROUP BY type`,
    [bookId],
  );

  const counts: Record<EditableCategoryType, number> = { income: 0, expense: 0 };
  for (const row of rows) {
    counts[row.type] = Number(row.count);
  }
  return counts;
}

async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const rows = await db.select<Category[]>("SELECT * FROM categories WHERE id = ? LIMIT 1", [id]);
  return rows[0] ?? null;
}

function assertCategoryName(name: string): string {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Category name is required");
  }
  return trimmedName;
}

export async function createCategory(input: {
  bookId: string;
  type: EditableCategoryType;
  name: string;
}): Promise<Category> {
  const name = assertCategoryName(input.name);
  const ts = now();

  const category = await runInTransaction(async (db) => {
    const sortRows = await db.select<Array<{ sort_order: number | null }>>(
      `SELECT MAX(sort_order) AS sort_order
       FROM categories
       WHERE book_id = ? AND type = ?`,
      [input.bookId, input.type],
    );
    const sortOrder = Number(sortRows[0]?.sort_order ?? 0) + 10;
    const nextCategory: Category = {
      id: uuid(),
      book_id: input.bookId,
      parent_id: null,
      name,
      type: input.type,
      is_archived: false,
      sort_order: sortOrder,
      created_at: ts,
      sync_status: "pending",
      local_updated_at: ts,
      server_updated_at: null,
    };

    await db.execute(
      `INSERT INTO categories
         (id, book_id, parent_id, name, type, is_archived, sort_order, created_at,
          sync_status, local_updated_at, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextCategory.id,
        nextCategory.book_id,
        nextCategory.parent_id,
        nextCategory.name,
        nextCategory.type,
        0,
        nextCategory.sort_order,
        nextCategory.created_at,
        nextCategory.sync_status,
        nextCategory.local_updated_at,
        nextCategory.server_updated_at,
      ],
    );

    await enqueueOutbox(db, "category", nextCategory.id, "create", nextCategory, ts);

    return nextCategory;
  });

  return category;
}

export async function updateCategoryName(id: string, name: string): Promise<Category> {
  const existing = await getCategory(id);
  if (!existing) throw new Error("Category not found");

  const ts = now();
  const category: Category = {
    ...existing,
    name: assertCategoryName(name),
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `UPDATE categories
       SET name = ?,
           sync_status = ?,
           local_updated_at = ?,
           server_updated_at = ?
       WHERE id = ?`,
      [
        category.name,
        category.sync_status,
        category.local_updated_at,
        category.server_updated_at,
        category.id,
      ],
    );

    await enqueueOutbox(db, "category", category.id, "update", category, ts);
  });

  return category;
}

async function setCategoryArchived(id: string, archived: boolean): Promise<Category> {
  const existing = await getCategory(id);
  if (!existing) throw new Error("Category not found");

  const ts = now();
  const category: Category = {
    ...existing,
    is_archived: archived,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await runInTransaction(async (db) => {
    await db.execute(
      `UPDATE categories
       SET is_archived = ?,
           sync_status = ?,
           local_updated_at = ?,
           server_updated_at = ?
       WHERE id = ?`,
      [
        archived ? 1 : 0,
        category.sync_status,
        category.local_updated_at,
        category.server_updated_at,
        category.id,
      ],
    );

    await enqueueOutbox(db, "category", category.id, "update", category, ts);
  });

  return category;
}

export async function archiveCategory(id: string): Promise<Category> {
  return setCategoryArchived(id, true);
}

export async function restoreCategory(id: string): Promise<Category> {
  return setCategoryArchived(id, false);
}

export async function getCategoryUsage(id: string): Promise<CategoryUsage> {
  const db = await getDb();
  const [transactionRows, recurringRows, childRows] = await Promise.all([
    db.select<CountRow[]>("SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?", [id]),
    db.select<CountRow[]>(
      "SELECT COUNT(*) AS count FROM recurring_templates WHERE category_id = ?",
      [id],
    ),
    db.select<CountRow[]>("SELECT COUNT(*) AS count FROM categories WHERE parent_id = ?", [id]),
  ]);
  const transactions = Number(transactionRows[0]?.count ?? 0);
  const recurringTemplates = Number(recurringRows[0]?.count ?? 0);
  const childCategories = Number(childRows[0]?.count ?? 0);

  return {
    transactions,
    recurringTemplates,
    childCategories,
    total: transactions + recurringTemplates + childCategories,
  };
}

export async function deleteCategory(id: string): Promise<void> {
  const existing = await getCategory(id);
  if (!existing) throw new Error("Category not found");

  const usage = await getCategoryUsage(id);
  if (usage.total > 0) {
    throw new Error("Category is in use");
  }

  const ts = now();

  await runInTransaction(async (txDb) => {
    await txDb.execute("DELETE FROM categories WHERE id = ?", [id]);
    await enqueueOutbox(
      txDb,
      "category",
      id,
      "delete",
      { ...existing, deleted_at: ts, local_updated_at: ts },
      ts,
    );
  });
}

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>("SELECT * FROM tags WHERE is_archived = 0 ORDER BY name");
}

export async function findOrCreateTag(name: string): Promise<Tag | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const ts = now();
  const tag: Tag = {
    id: uuid(),
    name: trimmedName,
    description: null,
    is_archived: false,
    created_at: ts,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  const result = await runInTransaction(async (txDb) => {
    const existing = await txDb.select<Tag[]>(
      `SELECT * FROM tags
       WHERE name = ? COLLATE NOCASE
       ORDER BY is_archived ASC, local_updated_at DESC
       LIMIT 1`,
      [trimmedName],
    );

    const existingTag = existing[0];
    if (existingTag) {
      if (!existingTag.is_archived) return existingTag;

      const restoredTag: Tag = {
        ...existingTag,
        name: trimmedName,
        is_archived: false,
        sync_status: "pending",
        local_updated_at: ts,
        server_updated_at: null,
      };

      await txDb.execute(
        `UPDATE tags
         SET name = ?,
             is_archived = 0,
             sync_status = ?,
             local_updated_at = ?,
             server_updated_at = ?
         WHERE id = ?`,
        [
          restoredTag.name,
          restoredTag.sync_status,
          restoredTag.local_updated_at,
          restoredTag.server_updated_at,
          restoredTag.id,
        ],
      );

      await enqueueOutbox(txDb, "tag", restoredTag.id, "update", restoredTag, ts);
      return restoredTag;
    }

    await txDb.execute(
      `INSERT INTO tags
         (id, name, description, is_archived, created_at, sync_status, local_updated_at, server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tag.id,
        tag.name,
        tag.description,
        0,
        tag.created_at,
        tag.sync_status,
        tag.local_updated_at,
        tag.server_updated_at,
      ],
    );

    await enqueueOutbox(txDb, "tag", tag.id, "create", tag, ts);

    return tag;
  });

  return result;
}
