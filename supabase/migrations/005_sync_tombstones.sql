-- Rheo Finance: soft-delete tombstones for sync
-- Existing projects should run this after 004_delete_current_user_rpc.sql.
-- The app keeps deleted remote rows as tombstones so other devices can pull deletes.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.recurring_templates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_books_user_updated ON public.books(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_updated ON public.accounts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_categories_user_updated ON public.categories(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tags_user_updated ON public.tags(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_recurring_user_updated ON public.recurring_templates(user_id, updated_at);
