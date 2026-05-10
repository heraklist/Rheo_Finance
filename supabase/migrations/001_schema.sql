-- Evochia Finance: Supabase Postgres schema
-- Remote data tables only. Local-only sync_outbox/sync_metadata remain in SQLite.
-- IDs stay TEXT to mirror local seeded IDs such as book-business and cat-biz-exp-*.

-- ============================================================
-- UPDATED_AT helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- BOOKS: business / personal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug IN ('business', 'personal')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

-- ============================================================
-- ACCOUNTS: accounts per book
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'card')),
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- CATEGORIES: hierarchical categories per book
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'reserve', 'transfer')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAGS: events / clients
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RECURRING TEMPLATES: recurring income/expenses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recurring_templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES public.accounts(id),
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  tag_id TEXT REFERENCES public.tags(id),
  amount_gross NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,4) NOT NULL DEFAULT 0.24,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'quarterly', 'yearly')),
  day_of_period INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE,
  last_generated DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRANSACTIONS: primary ledger entity
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  book_id TEXT NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES public.accounts(id),
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  tag_id TEXT REFERENCES public.tags(id),
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('Μετρητά', 'Κάρτα', 'Τραπεζική μεταφορά', 'IRIS', 'Άλλο')
  ),
  amount_gross NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,4) NOT NULL DEFAULT 0.24,
  amount_vat NUMERIC(12,2) GENERATED ALWAYS AS
    (amount_gross - amount_gross / (1 + vat_rate)) STORED,
  amount_net NUMERIC(12,2) GENERATED ALWAYS AS
    (amount_gross / (1 + vat_rate)) STORED,
  receipt_photo_path TEXT,
  recurring_template_id TEXT REFERENCES public.recurring_templates(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS set_books_updated_at ON public.books;
CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_accounts_updated_at ON public.accounts;
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_categories_updated_at ON public.categories;
CREATE TRIGGER set_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_tags_updated_at ON public.tags;
CREATE TRIGGER set_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_recurring_templates_updated_at ON public.recurring_templates;
CREATE TRIGGER set_recurring_templates_updated_at
  BEFORE UPDATE ON public.recurring_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON public.transactions;
CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_books_user ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_book ON public.accounts(user_id, book_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_book ON public.categories(user_id, book_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name_unique
  ON public.tags(user_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_recurring_user_active
  ON public.recurring_templates(user_id, active, last_generated);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_book_date ON public.transactions(user_id, book_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_user_category ON public.transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_tx_user_updated ON public.transactions(user_id, updated_at);
