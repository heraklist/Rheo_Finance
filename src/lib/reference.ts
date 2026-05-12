import { getDb, now, uuid } from "@/lib/db";
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
  } = {},
): Promise<Category[]> {
  const db = await getDb();
  const conditions: string[] = ["is_archived = 0"];
  const params: string[] = [];

  if (opts.bookId) {
    conditions.push("book_id = ?");
    params.push(opts.bookId);
  }
  if (opts.type) {
    conditions.push("type = ?");
    params.push(opts.type);
  }

  return db.select<Category[]>(
    `SELECT * FROM categories WHERE ${conditions.join(" AND ")}
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
  const db = await getDb();
  const name = assertCategoryName(input.name);
  const ts = now();
  const sortRows = await db.select<Array<{ sort_order: number | null }>>(
    `SELECT MAX(sort_order) AS sort_order
     FROM categories
     WHERE book_id = ? AND type = ?`,
    [input.bookId, input.type],
  );
  const sortOrder = Number(sortRows[0]?.sort_order ?? 0) + 10;
  const category: Category = {
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
      category.id,
      category.book_id,
      category.parent_id,
      category.name,
      category.type,
      0,
      category.sort_order,
      category.created_at,
      category.sync_status,
      category.local_updated_at,
      category.server_updated_at,
    ],
  );

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["category", category.id, "create", JSON.stringify(category), ts],
  );

  return category;
}

export async function updateCategoryName(id: string, name: string): Promise<Category> {
  const db = await getDb();
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

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["category", category.id, "update", JSON.stringify(category), ts],
  );

  return category;
}

export async function archiveCategory(id: string): Promise<Category> {
  const db = await getDb();
  const existing = await getCategory(id);
  if (!existing) throw new Error("Category not found");

  const ts = now();
  const category: Category = {
    ...existing,
    is_archived: true,
    sync_status: "pending",
    local_updated_at: ts,
    server_updated_at: null,
  };

  await db.execute(
    `UPDATE categories
     SET is_archived = 1,
         sync_status = ?,
         local_updated_at = ?,
         server_updated_at = ?
     WHERE id = ?`,
    [category.sync_status, category.local_updated_at, category.server_updated_at, category.id],
  );

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["category", category.id, "update", JSON.stringify(category), ts],
  );

  return category;
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
  const db = await getDb();
  const existing = await getCategory(id);
  if (!existing) throw new Error("Category not found");

  const usage = await getCategoryUsage(id);
  if (usage.total > 0) {
    throw new Error("Category is in use");
  }

  const ts = now();

  await db.execute("DELETE FROM categories WHERE id = ?", [id]);
  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      "category",
      id,
      "delete",
      JSON.stringify({
        ...existing,
        deleted_at: ts,
        local_updated_at: ts,
      }),
      ts,
    ],
  );
}

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>("SELECT * FROM tags WHERE is_archived = 0 ORDER BY name");
}

export async function findOrCreateTag(name: string): Promise<Tag | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const db = await getDb();
  const existing = await db.select<Tag[]>(
    "SELECT * FROM tags WHERE LOWER(name) = LOWER(?) AND is_archived = 0 LIMIT 1",
    [trimmedName],
  );

  if (existing[0]) return existing[0];

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

  await db.execute(
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

  await db.execute(
    `INSERT INTO sync_outbox (entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    ["tag", tag.id, "create", JSON.stringify(tag), ts],
  );

  return tag;
}
