-- Rheo Finance: local user scope for monthly coverage rows.
-- Remote coverage tables already require user_id for RLS; this mirrors the
-- column locally so pulled rows keep attribution and local queries can scope.

ALTER TABLE coverage_expense ADD COLUMN user_id TEXT;
ALTER TABLE coverage_income ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_coverage_expense_user_month
  ON coverage_expense(user_id, book_id, year, month);

CREATE INDEX IF NOT EXISTS idx_coverage_income_user_month
  ON coverage_income(user_id, book_id, year, month);
