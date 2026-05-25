-- Rheo Finance: replace hardcoded seed IDs with UUIDs for multi-user SaaS support.
-- Without this, two users pushing "book-business" to Supabase would cause a PK conflict.
-- This only runs before the first successful sync. Existing synced databases keep
-- their remote IDs because local primary-key rotation after sync would duplicate
-- or orphan remote rows.

CREATE TEMP TABLE _seed_rotation_guard (should_rotate INTEGER NOT NULL);

INSERT INTO _seed_rotation_guard (should_rotate)
SELECT CASE
  WHEN COALESCE(
    (SELECT value FROM sync_metadata WHERE key = 'last_synced_at' LIMIT 1),
    '1970-01-01T00:00:00.000Z'
  ) IN ('', '1970-01-01T00:00:00.000Z')
  AND NOT EXISTS (SELECT 1 FROM books WHERE server_updated_at IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE server_updated_at IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM categories WHERE server_updated_at IS NOT NULL)
  THEN 1
  ELSE 0
END;

-- tauri-plugin-sql executes migrations in a transaction. Deferring FK checks
-- keeps PK/FK rotations atomic; PRAGMA foreign_keys = OFF would not work here.
PRAGMA defer_foreign_keys = ON;

CREATE TEMP TABLE _id_map (old_id TEXT PRIMARY KEY, new_id TEXT NOT NULL);

INSERT INTO _id_map (old_id, new_id)
SELECT id,
       lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
             substr(hex(randomblob(2)),2) || '-' ||
             substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' ||
             hex(randomblob(6)))
FROM books
WHERE id LIKE 'book-%'
  AND (SELECT should_rotate FROM _seed_rotation_guard) = 1;

INSERT INTO _id_map (old_id, new_id)
SELECT id,
       lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
             substr(hex(randomblob(2)),2) || '-' ||
             substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' ||
             hex(randomblob(6)))
FROM accounts
WHERE id LIKE 'acc-%'
  AND (SELECT should_rotate FROM _seed_rotation_guard) = 1;

INSERT INTO _id_map (old_id, new_id)
SELECT id,
       lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
             substr(hex(randomblob(2)),2) || '-' ||
             substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' ||
             hex(randomblob(6)))
FROM categories
WHERE id LIKE 'cat-%'
  AND (SELECT should_rotate FROM _seed_rotation_guard) = 1;

-- Books, accounts and categories own the hardcoded seed IDs. Update every
-- direct FK that can point to those rows, then update the primary keys.
UPDATE books SET id = (SELECT new_id FROM _id_map WHERE old_id = books.id)
WHERE id IN (SELECT old_id FROM _id_map);

UPDATE accounts SET book_id = (SELECT new_id FROM _id_map WHERE old_id = accounts.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE accounts SET id = (SELECT new_id FROM _id_map WHERE old_id = accounts.id)
WHERE id IN (SELECT old_id FROM _id_map);

UPDATE categories SET book_id = (SELECT new_id FROM _id_map WHERE old_id = categories.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE categories SET parent_id = (SELECT new_id FROM _id_map WHERE old_id = categories.parent_id)
WHERE parent_id IN (SELECT old_id FROM _id_map);

UPDATE categories SET id = (SELECT new_id FROM _id_map WHERE old_id = categories.id)
WHERE id IN (SELECT old_id FROM _id_map);

UPDATE recurring_templates SET book_id = (SELECT new_id FROM _id_map WHERE old_id = recurring_templates.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE recurring_templates SET account_id = (SELECT new_id FROM _id_map WHERE old_id = recurring_templates.account_id)
WHERE account_id IN (SELECT old_id FROM _id_map);

UPDATE recurring_templates SET category_id = (SELECT new_id FROM _id_map WHERE old_id = recurring_templates.category_id)
WHERE category_id IN (SELECT old_id FROM _id_map);

UPDATE transactions SET book_id = (SELECT new_id FROM _id_map WHERE old_id = transactions.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE transactions SET account_id = (SELECT new_id FROM _id_map WHERE old_id = transactions.account_id)
WHERE account_id IN (SELECT old_id FROM _id_map);

UPDATE transactions SET category_id = (SELECT new_id FROM _id_map WHERE old_id = transactions.category_id)
WHERE category_id IN (SELECT old_id FROM _id_map);

UPDATE coverage_expense SET book_id = (SELECT new_id FROM _id_map WHERE old_id = coverage_expense.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE coverage_income SET book_id = (SELECT new_id FROM _id_map WHERE old_id = coverage_income.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE plan SET book_id = (SELECT new_id FROM _id_map WHERE old_id = plan.book_id)
WHERE book_id IN (SELECT old_id FROM _id_map);

UPDATE sync_outbox SET entity_id = (SELECT new_id FROM _id_map WHERE old_id = sync_outbox.entity_id)
WHERE entity_id IN (SELECT old_id FROM _id_map);

UPDATE sync_outbox
SET payload = json_set(payload, '$.id', (SELECT new_id FROM _id_map WHERE old_id = json_extract(payload, '$.id')))
WHERE json_valid(payload)
  AND json_extract(payload, '$.id') IN (SELECT old_id FROM _id_map);

UPDATE sync_outbox
SET payload = json_set(payload, '$.book_id', (SELECT new_id FROM _id_map WHERE old_id = json_extract(payload, '$.book_id')))
WHERE json_valid(payload)
  AND json_extract(payload, '$.book_id') IN (SELECT old_id FROM _id_map);

UPDATE sync_outbox
SET payload = json_set(payload, '$.account_id', (SELECT new_id FROM _id_map WHERE old_id = json_extract(payload, '$.account_id')))
WHERE json_valid(payload)
  AND json_extract(payload, '$.account_id') IN (SELECT old_id FROM _id_map);

UPDATE sync_outbox
SET payload = json_set(payload, '$.category_id', (SELECT new_id FROM _id_map WHERE old_id = json_extract(payload, '$.category_id')))
WHERE json_valid(payload)
  AND json_extract(payload, '$.category_id') IN (SELECT old_id FROM _id_map);

UPDATE sync_outbox
SET payload = json_set(payload, '$.parent_id', (SELECT new_id FROM _id_map WHERE old_id = json_extract(payload, '$.parent_id')))
WHERE json_valid(payload)
  AND json_extract(payload, '$.parent_id') IN (SELECT old_id FROM _id_map);

UPDATE books SET sync_status = 'pending', local_updated_at = datetime('now')
WHERE id IN (SELECT new_id FROM _id_map);

UPDATE accounts SET sync_status = 'pending', local_updated_at = datetime('now')
WHERE id IN (SELECT new_id FROM _id_map);

UPDATE categories SET sync_status = 'pending', local_updated_at = datetime('now')
WHERE id IN (SELECT new_id FROM _id_map);

DROP TABLE _id_map;
DROP TABLE _seed_rotation_guard;
