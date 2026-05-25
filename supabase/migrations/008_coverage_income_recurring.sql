-- Add linked_recurring_id to coverage_income for proper dedup (mirrors coverage_expense).
-- Run after 007_rls_policy_hardening.sql.

ALTER TABLE public.coverage_income
  ADD COLUMN IF NOT EXISTS linked_recurring_id TEXT REFERENCES public.recurring_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coverage_income_user_recurring
  ON public.coverage_income(user_id, book_id, year, month, linked_recurring_id);
