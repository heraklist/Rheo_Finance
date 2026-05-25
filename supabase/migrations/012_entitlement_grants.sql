-- Add entitlement grant metadata for owner/tester/manual access.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS grant_reason text,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_source_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_source_check
  CHECK (source IN ('stripe', 'manual', 'tester', 'owner'));

CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at
  ON public.subscriptions(expires_at)
  WHERE expires_at IS NOT NULL;
