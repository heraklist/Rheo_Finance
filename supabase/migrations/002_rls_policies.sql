-- Rheo Finance: Row Level Security policies
-- Deny by default; authenticated users can only access their own rows.

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BOOKS
-- ============================================================
DROP POLICY IF EXISTS "books_select_own" ON public.books;
DROP POLICY IF EXISTS "books_insert_own" ON public.books;
DROP POLICY IF EXISTS "books_update_own" ON public.books;
DROP POLICY IF EXISTS "books_delete_own" ON public.books;

CREATE POLICY "books_select_own" ON public.books
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "books_insert_own" ON public.books
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "books_update_own" ON public.books
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "books_delete_own" ON public.books
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- ACCOUNTS
-- ============================================================
DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;

CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "categories_select_own" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_own" ON public.categories;
DROP POLICY IF EXISTS "categories_update_own" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_own" ON public.categories;

CREATE POLICY "categories_select_own" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TAGS
-- ============================================================
DROP POLICY IF EXISTS "tags_select_own" ON public.tags;
DROP POLICY IF EXISTS "tags_insert_own" ON public.tags;
DROP POLICY IF EXISTS "tags_update_own" ON public.tags;
DROP POLICY IF EXISTS "tags_delete_own" ON public.tags;

CREATE POLICY "tags_select_own" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tags_insert_own" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tags_update_own" ON public.tags
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tags_delete_own" ON public.tags
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- RECURRING TEMPLATES
-- ============================================================
DROP POLICY IF EXISTS "recurring_templates_select_own" ON public.recurring_templates;
DROP POLICY IF EXISTS "recurring_templates_insert_own" ON public.recurring_templates;
DROP POLICY IF EXISTS "recurring_templates_update_own" ON public.recurring_templates;
DROP POLICY IF EXISTS "recurring_templates_delete_own" ON public.recurring_templates;

CREATE POLICY "recurring_templates_select_own" ON public.recurring_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "recurring_templates_insert_own" ON public.recurring_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_templates_update_own" ON public.recurring_templates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "recurring_templates_delete_own" ON public.recurring_templates
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;

CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);
