-- Rheo Finance: seed default data
-- Idempotent — uses INSERT OR IGNORE

-- ============================================================
-- BOOKS
-- ============================================================
INSERT OR IGNORE INTO books (id, slug, name, created_at, local_updated_at) VALUES
  ('book-business', 'business', 'Επαγγελματικά', datetime('now'), datetime('now')),
  ('book-personal', 'personal', 'Προσωπικά', datetime('now'), datetime('now'));

-- ============================================================
-- ACCOUNTS
-- ============================================================
INSERT OR IGNORE INTO accounts (id, book_id, name, type, initial_balance, created_at, local_updated_at) VALUES
  ('acc-biz-cash', 'book-business', 'Ταμείο Rheo', 'cash', 0, datetime('now'), datetime('now')),
  ('acc-biz-bank', 'book-business', 'Τράπεζα Rheo', 'bank', 0, datetime('now'), datetime('now')),
  ('acc-biz-card', 'book-business', 'Κάρτα Rheo', 'card', 0, datetime('now'), datetime('now')),
  ('acc-pers-cash', 'book-personal', 'Ταμείο Προσωπικό', 'cash', 0, datetime('now'), datetime('now')),
  ('acc-pers-bank', 'book-personal', 'Τράπεζα Προσωπική', 'bank', 0, datetime('now'), datetime('now')),
  ('acc-pers-card', 'book-personal', 'Κάρτα Προσωπική', 'card', 0, datetime('now'), datetime('now'));

-- ============================================================
-- CATEGORIES — Επαγγελματικά (Business)
-- ============================================================
-- Έσοδα
INSERT OR IGNORE INTO categories (id, book_id, parent_id, name, type, sort_order, created_at, local_updated_at) VALUES
  ('cat-biz-inc-catering', 'book-business', NULL, 'Catering / Εκδηλώσεις', 'income', 10, datetime('now'), datetime('now')),
  ('cat-biz-inc-private', 'book-business', NULL, 'Private chef', 'income', 20, datetime('now'), datetime('now')),
  ('cat-biz-inc-consulting', 'book-business', NULL, 'Συμβουλευτικές υπηρεσίες', 'income', 30, datetime('now'), datetime('now')),
  ('cat-biz-inc-popup', 'book-business', NULL, 'Pop-up / Residency', 'income', 40, datetime('now'), datetime('now')),
  ('cat-biz-inc-mealprep', 'book-business', NULL, 'Meal prep / Συνδρομές', 'income', 50, datetime('now'), datetime('now')),
  ('cat-biz-inc-other', 'book-business', NULL, 'Λοιπά έσοδα', 'income', 99, datetime('now'), datetime('now'));

-- Έξοδα
INSERT OR IGNORE INTO categories (id, book_id, parent_id, name, type, sort_order, created_at, local_updated_at) VALUES
  ('cat-biz-exp-materials', 'book-business', NULL, 'Πρώτες ύλες', 'expense', 10, datetime('now'), datetime('now')),
  ('cat-biz-exp-operations', 'book-business', NULL, 'Λειτουργικά', 'expense', 20, datetime('now'), datetime('now')),
  ('cat-biz-exp-rent', 'book-business', NULL, 'Ενοίκια', 'expense', 30, datetime('now'), datetime('now')),
  ('cat-biz-exp-electric', 'book-business', NULL, 'ΔΕΗ', 'expense', 40, datetime('now'), datetime('now')),
  ('cat-biz-exp-water', 'book-business', NULL, 'ΕΥΔΑΠ', 'expense', 50, datetime('now'), datetime('now')),
  ('cat-biz-exp-internet', 'book-business', NULL, 'Internet / Τηλεφωνία', 'expense', 60, datetime('now'), datetime('now')),
  ('cat-biz-exp-payroll', 'book-business', NULL, 'Προσωπικό / Μισθοδοσία', 'expense', 70, datetime('now'), datetime('now')),
  ('cat-biz-exp-transport', 'book-business', NULL, 'Μεταφορικά', 'expense', 80, datetime('now'), datetime('now')),
  ('cat-biz-exp-fuel', 'book-business', NULL, 'Καύσιμα', 'expense', 90, datetime('now'), datetime('now')),
  ('cat-biz-exp-tolls', 'book-business', NULL, 'Διόδια', 'expense', 100, datetime('now'), datetime('now')),
  ('cat-biz-exp-equipment', 'book-business', NULL, 'Επαγγ. εξοπλισμός', 'expense', 110, datetime('now'), datetime('now')),
  ('cat-biz-exp-insurance', 'book-business', NULL, 'Ασφάλιστρα / ΕΦΚΑ', 'expense', 120, datetime('now'), datetime('now')),
  ('cat-biz-exp-tax', 'book-business', NULL, 'Φόροι / ΦΠΑ', 'expense', 130, datetime('now'), datetime('now')),
  ('cat-biz-exp-marketing', 'book-business', NULL, 'Marketing / Διαφήμιση', 'expense', 140, datetime('now'), datetime('now')),
  ('cat-biz-exp-legal', 'book-business', NULL, 'Λογιστής / Νομικά', 'expense', 150, datetime('now'), datetime('now')),
  ('cat-biz-exp-tools', 'book-business', NULL, 'Συνδρομές / Εργαλεία', 'expense', 160, datetime('now'), datetime('now')),
  ('cat-biz-exp-other', 'book-business', NULL, 'Λοιπά έξοδα', 'expense', 199, datetime('now'), datetime('now'));

-- ============================================================
-- CATEGORIES — Προσωπικά (Personal)
-- ============================================================
INSERT OR IGNORE INTO categories (id, book_id, parent_id, name, type, sort_order, created_at, local_updated_at) VALUES
  ('cat-pers-inc-salary', 'book-personal', NULL, 'Μισθός / Αμοιβή', 'income', 10, datetime('now'), datetime('now')),
  ('cat-pers-inc-gifts', 'book-personal', NULL, 'Δώρα', 'income', 20, datetime('now'), datetime('now')),
  ('cat-pers-inc-other', 'book-personal', NULL, 'Λοιπά έσοδα', 'income', 99, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO categories (id, book_id, parent_id, name, type, sort_order, created_at, local_updated_at) VALUES
  ('cat-pers-exp-housing', 'book-personal', NULL, 'Στεγαστικά', 'expense', 10, datetime('now'), datetime('now')),
  ('cat-pers-exp-food', 'book-personal', NULL, 'Τρόφιμα / Σούπερ μάρκετ', 'expense', 20, datetime('now'), datetime('now')),
  ('cat-pers-exp-transport', 'book-personal', NULL, 'Μετακίνηση', 'expense', 30, datetime('now'), datetime('now')),
  ('cat-pers-exp-subscriptions', 'book-personal', NULL, 'Συνδρομές', 'expense', 40, datetime('now'), datetime('now')),
  ('cat-pers-exp-leisure', 'book-personal', NULL, 'Διασκέδαση', 'expense', 50, datetime('now'), datetime('now')),
  ('cat-pers-exp-health', 'book-personal', NULL, 'Υγεία', 'expense', 60, datetime('now'), datetime('now')),
  ('cat-pers-exp-clothing', 'book-personal', NULL, 'Ένδυση', 'expense', 70, datetime('now'), datetime('now')),
  ('cat-pers-exp-family', 'book-personal', NULL, 'Παιδιά / Οικογένεια', 'expense', 80, datetime('now'), datetime('now')),
  ('cat-pers-exp-other', 'book-personal', NULL, 'Λοιπά έξοδα', 'expense', 199, datetime('now'), datetime('now'));

-- ============================================================
-- SYNC METADATA: initial state
-- ============================================================
INSERT OR IGNORE INTO sync_metadata (key, value, updated_at) VALUES
  ('initialized_at', datetime('now'), datetime('now')),
  ('last_synced_at', '', datetime('now')),
  ('current_user_id', '', datetime('now'));
