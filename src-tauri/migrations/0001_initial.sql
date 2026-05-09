-- Evochia Finance: initial schema migration
-- Local SQLite version (mirror of Postgres + sync columns)

-- ============================================================
-- BOOKS: επαγγελματικά / προσωπικά
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT
);

-- ============================================================
-- ACCOUNTS: λογαριασμοί ανά book
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'card')),
  initial_balance REAL DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ============================================================
-- CATEGORIES: δενδρική δομή ανά book
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'reserve', 'transfer')),
  is_archived INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================================
-- TAGS: events / clients
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT
);

-- ============================================================
-- RECURRING TEMPLATES: πάγια έσοδα/έξοδα
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_templates (
  id TEXT PRIMARY KEY,
  active INTEGER DEFAULT 1,
  description TEXT NOT NULL,
  book_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  tag_id TEXT,
  amount_gross REAL NOT NULL,
  vat_rate REAL DEFAULT 0.24,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'quarterly', 'yearly')),
  day_of_period INTEGER DEFAULT 1,
  start_date TEXT NOT NULL,
  end_date TEXT,
  last_generated TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- ============================================================
-- TRANSACTIONS: η κύρια οντότητα
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  book_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  tag_id TEXT,
  payment_method TEXT NOT NULL,
  amount_gross REAL NOT NULL,
  vat_rate REAL NOT NULL DEFAULT 0.24,
  amount_vat REAL NOT NULL,
  amount_net REAL NOT NULL,
  receipt_photo_path TEXT,
  recurring_template_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id),
  FOREIGN KEY (recurring_template_id) REFERENCES recurring_templates(id)
);

-- ============================================================
-- SYNC OUTBOX: queue of pending mutations
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL
);

-- ============================================================
-- SYNC METADATA: key-value store για sync state
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============================================================
-- INDEXES για performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_book_date ON transactions(book_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_tx_recurring ON transactions(recurring_template_id);
CREATE INDEX IF NOT EXISTS idx_tx_sync ON transactions(sync_status) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON sync_outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_book ON categories(book_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_templates(active, last_generated);
