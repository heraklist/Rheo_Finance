-- Rheo Finance: Plan Hub and Monthly Coverage remote schema
-- Run after 005_sync_tombstones.sql.

CREATE TABLE IF NOT EXISTS public.plan (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom'
    CHECK (type IN ('purchase', 'project', 'travel', 'emergency', 'debt', 'custom')),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'paused')),
  include_in_forecast BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.plan_expense_item (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plan(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'one_off'
    CHECK (type IN ('one_off', 'recurring')),
  category TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'essential'
    CHECK (priority IN ('essential', 'optional', 'nice_to_have')),
  account_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
  duration_months INTEGER NOT NULL DEFAULT 1,
  target_month INTEGER NOT NULL DEFAULT 1,
  included BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.plan_income_item (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plan(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'one_off'
    CHECK (type IN ('one_off', 'recurring')),
  category TEXT NOT NULL DEFAULT '',
  confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high', 'medium', 'low')),
  duration_months INTEGER NOT NULL DEFAULT 1,
  target_month INTEGER NOT NULL DEFAULT 1,
  included BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.coverage_expense (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'recurring'
    CHECK (type IN ('recurring', 'one_off', 'variable')),
  due_date INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  linked_recurring_id TEXT REFERENCES public.recurring_templates(id) ON DELETE SET NULL,
  linked_transaction_id TEXT REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.coverage_income (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high', 'medium', 'low')),
  expected_date INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  received BOOLEAN NOT NULL DEFAULT false,
  linked_transaction_id TEXT REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS set_plan_updated_at ON public.plan;
CREATE TRIGGER set_plan_updated_at
  BEFORE UPDATE ON public.plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_plan_expense_item_updated_at ON public.plan_expense_item;
CREATE TRIGGER set_plan_expense_item_updated_at
  BEFORE UPDATE ON public.plan_expense_item
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_plan_income_item_updated_at ON public.plan_income_item;
CREATE TRIGGER set_plan_income_item_updated_at
  BEFORE UPDATE ON public.plan_income_item
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_coverage_expense_updated_at ON public.coverage_expense;
CREATE TRIGGER set_coverage_expense_updated_at
  BEFORE UPDATE ON public.coverage_expense
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_coverage_income_updated_at ON public.coverage_income;
CREATE TRIGGER set_coverage_income_updated_at
  BEFORE UPDATE ON public.coverage_income
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_expense_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_income_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_select_own" ON public.plan;
DROP POLICY IF EXISTS "plan_insert_own" ON public.plan;
DROP POLICY IF EXISTS "plan_update_own" ON public.plan;
DROP POLICY IF EXISTS "plan_delete_own" ON public.plan;
CREATE POLICY "plan_select_own" ON public.plan
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plan_insert_own" ON public.plan
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_update_own" ON public.plan
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_delete_own" ON public.plan
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_expense_item_select_own" ON public.plan_expense_item;
DROP POLICY IF EXISTS "plan_expense_item_insert_own" ON public.plan_expense_item;
DROP POLICY IF EXISTS "plan_expense_item_update_own" ON public.plan_expense_item;
DROP POLICY IF EXISTS "plan_expense_item_delete_own" ON public.plan_expense_item;
CREATE POLICY "plan_expense_item_select_own" ON public.plan_expense_item
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plan_expense_item_insert_own" ON public.plan_expense_item
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_expense_item_update_own" ON public.plan_expense_item
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_expense_item_delete_own" ON public.plan_expense_item
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_income_item_select_own" ON public.plan_income_item;
DROP POLICY IF EXISTS "plan_income_item_insert_own" ON public.plan_income_item;
DROP POLICY IF EXISTS "plan_income_item_update_own" ON public.plan_income_item;
DROP POLICY IF EXISTS "plan_income_item_delete_own" ON public.plan_income_item;
CREATE POLICY "plan_income_item_select_own" ON public.plan_income_item
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plan_income_item_insert_own" ON public.plan_income_item
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_income_item_update_own" ON public.plan_income_item
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plan_income_item_delete_own" ON public.plan_income_item
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coverage_expense_select_own" ON public.coverage_expense;
DROP POLICY IF EXISTS "coverage_expense_insert_own" ON public.coverage_expense;
DROP POLICY IF EXISTS "coverage_expense_update_own" ON public.coverage_expense;
DROP POLICY IF EXISTS "coverage_expense_delete_own" ON public.coverage_expense;
CREATE POLICY "coverage_expense_select_own" ON public.coverage_expense
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coverage_expense_insert_own" ON public.coverage_expense
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coverage_expense_update_own" ON public.coverage_expense
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coverage_expense_delete_own" ON public.coverage_expense
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coverage_income_select_own" ON public.coverage_income;
DROP POLICY IF EXISTS "coverage_income_insert_own" ON public.coverage_income;
DROP POLICY IF EXISTS "coverage_income_update_own" ON public.coverage_income;
DROP POLICY IF EXISTS "coverage_income_delete_own" ON public.coverage_income;
CREATE POLICY "coverage_income_select_own" ON public.coverage_income
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coverage_income_insert_own" ON public.coverage_income
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coverage_income_update_own" ON public.coverage_income
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coverage_income_delete_own" ON public.coverage_income
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plan_user_book ON public.plan(user_id, book_id, status);
CREATE INDEX IF NOT EXISTS idx_plan_user_updated ON public.plan(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_plan_expense_user_plan
  ON public.plan_expense_item(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_expense_user_updated
  ON public.plan_expense_item(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_plan_income_user_plan
  ON public.plan_income_item(user_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_income_user_updated
  ON public.plan_income_item(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_coverage_expense_user_month
  ON public.coverage_expense(user_id, book_id, year, month);
CREATE INDEX IF NOT EXISTS idx_coverage_expense_user_updated
  ON public.coverage_expense(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_coverage_income_user_month
  ON public.coverage_income(user_id, book_id, year, month);
CREATE INDEX IF NOT EXISTS idx_coverage_income_user_updated
  ON public.coverage_income(user_id, updated_at);
