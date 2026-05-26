-- Add indexes on foreign key columns to support DELETE cascades and JOIN performance.
-- Composite (user_id, fk_col) indexes already exist for RLS-scoped queries,
-- but standalone FK indexes are needed for parent-row DELETE validation.

-- transactions (largest table — most impactful)
CREATE INDEX IF NOT EXISTS idx_tx_book_id ON public.transactions (book_id);
CREATE INDEX IF NOT EXISTS idx_tx_account_id ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_tx_category_id ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_tx_tag_id ON public.transactions (tag_id);
CREATE INDEX IF NOT EXISTS idx_tx_recurring_id ON public.transactions (recurring_template_id);

-- categories (self-referential parent_id)
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_book_id ON public.categories (book_id);

-- accounts
CREATE INDEX IF NOT EXISTS idx_accounts_book_id ON public.accounts (book_id);

-- recurring_templates
CREATE INDEX IF NOT EXISTS idx_recurring_book_id ON public.recurring_templates (book_id);
CREATE INDEX IF NOT EXISTS idx_recurring_account_id ON public.recurring_templates (account_id);
CREATE INDEX IF NOT EXISTS idx_recurring_category_id ON public.recurring_templates (category_id);
CREATE INDEX IF NOT EXISTS idx_recurring_tag_id ON public.recurring_templates (tag_id);

-- plan
CREATE INDEX IF NOT EXISTS idx_plan_book_id ON public.plan (book_id);

-- plan_expense_item
CREATE INDEX IF NOT EXISTS idx_plan_expense_plan_id ON public.plan_expense_item (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_expense_account_id ON public.plan_expense_item (account_id);

-- plan_income_item
CREATE INDEX IF NOT EXISTS idx_plan_income_plan_id ON public.plan_income_item (plan_id);

-- coverage_expense
CREATE INDEX IF NOT EXISTS idx_cov_expense_book_id ON public.coverage_expense (book_id);
CREATE INDEX IF NOT EXISTS idx_cov_expense_recurring_id ON public.coverage_expense (linked_recurring_id);
CREATE INDEX IF NOT EXISTS idx_cov_expense_transaction_id ON public.coverage_expense (linked_transaction_id);

-- coverage_income
CREATE INDEX IF NOT EXISTS idx_cov_income_book_id ON public.coverage_income (book_id);
CREATE INDEX IF NOT EXISTS idx_cov_income_recurring_id ON public.coverage_income (linked_recurring_id);
CREATE INDEX IF NOT EXISTS idx_cov_income_transaction_id ON public.coverage_income (linked_transaction_id);

-- subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_granted_by ON public.subscriptions (granted_by);
