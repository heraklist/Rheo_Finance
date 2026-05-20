-- Normalize old installs that seeded last_synced_at as an empty string.
UPDATE sync_metadata
SET value = '1970-01-01T00:00:00.000Z',
    updated_at = datetime('now')
WHERE key = 'last_synced_at'
  AND value = '';
