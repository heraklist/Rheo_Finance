-- Rheo Finance: plan hub and monthly coverage schema

CREATE TABLE IF NOT EXISTS plan (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom'
    CHECK (type IN ('purchase', 'project', 'travel', 'emergency', 'debt', 'custom')),
  target_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'paused')),
  include_in_forecast INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plan_expense_item (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'one_off'
    CHECK (type IN ('one_off', 'recurring')),
  category TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'essential'
    CHECK (priority IN ('essential', 'optional', 'nice_to_have')),
  account_id TEXT,
  duration_months INTEGER NOT NULL DEFAULT 1,
  target_month INTEGER NOT NULL DEFAULT 1,
  included INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS plan_income_item (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'one_off'
    CHECK (type IN ('one_off', 'recurring')),
  category TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high', 'medium', 'low')),
  duration_months INTEGER NOT NULL DEFAULT 1,
  target_month INTEGER NOT NULL DEFAULT 1,
  included INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (plan_id) REFERENCES plan(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS coverage_expense (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'recurring'
    CHECK (type IN ('recurring', 'one_off', 'variable')),
  due_date INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  linked_recurring_id TEXT,
  linked_transaction_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_recurring_id) REFERENCES recurring_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS coverage_income (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high', 'medium', 'low')),
  expected_date INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  received INTEGER NOT NULL DEFAULT 0,
  linked_transaction_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  local_updated_at TEXT NOT NULL,
  server_updated_at TEXT,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_book_status ON plan(book_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_sync ON plan(sync_status) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_plan_expense_plan ON plan_expense_item(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_income_plan ON plan_income_item(plan_id);
CREATE INDEX IF NOT EXISTS idx_coverage_expense_month ON coverage_expense(book_id, year, month);
CREATE INDEX IF NOT EXISTS idx_coverage_income_month ON coverage_income(book_id, year, month);
CREATE INDEX IF NOT EXISTS idx_coverage_expense_sync
  ON coverage_expense(sync_status) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_coverage_income_sync
  ON coverage_income(sync_status) WHERE sync_status = 'pending';
