import { getDb, now, uuid } from "@/lib/db";
import type { Account, Book, Category, Tag } from "@/lib/types";

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
