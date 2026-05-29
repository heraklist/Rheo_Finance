-- Rheo Finance: make local tag-name uniqueness case-insensitive.
--
-- Problem: `tags.name` was UNIQUE with the default BINARY collation, while
-- findOrCreateTag() looks up tags case-insensitively. A tag differing only by
-- case (or an archived same-name tag) was not found by the lookup, and the
-- subsequent INSERT then violated UNIQUE and threw — surfacing to the user as
-- "Δεν αποθηκεύτηκε η συναλλαγή". The remote DB already enforces
-- lower(name) uniqueness, so this also realigns local and remote semantics.
--
-- This migration is intentionally NON-destructive: it does NOT rebuild the
-- table. Instead it (1) de-duplicates any existing case-variant names so the
-- new index can be created, then (2) adds a case-insensitive UNIQUE index.
-- The application-level fix in findOrCreateTag (COLLATE NOCASE lookup +
-- reactivating archived tags) is the primary guard; this index is
-- defense-in-depth.

-- 1) De-duplicate pre-existing case-variant names. Keep the lexicographically
--    smallest id for each lower(name); archive (don't delete) the rest so any
--    transactions still referencing them remain valid, and rename them to avoid
--    colliding with the new index.
UPDATE tags
SET name = name || '~dup~' || id,
    is_archived = 1,
    sync_status = 'pending',
    local_updated_at = datetime('now')
WHERE id NOT IN (
  SELECT MIN(id) FROM tags GROUP BY lower(name)
);

-- 2) Case-insensitive uniqueness going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_nocase ON tags(name COLLATE NOCASE);
