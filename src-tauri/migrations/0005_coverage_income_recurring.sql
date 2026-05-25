-- Add linked_recurring_id to coverage_income for proper dedup (mirrors coverage_expense).
ALTER TABLE coverage_income ADD COLUMN linked_recurring_id TEXT
  REFERENCES recurring_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coverage_income_recurring
  ON coverage_income(book_id, month, year, linked_recurring_id);
