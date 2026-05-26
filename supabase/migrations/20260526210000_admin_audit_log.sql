-- Admin audit log: tracks all admin-initiated grant changes.
-- Append-only. No UPDATE/DELETE allowed for authenticated users.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    text NOT NULL,
  admin_email text NOT NULL,
  action      text NOT NULL,           -- e.g. 'grant_upsert'
  target_user_id   uuid,
  target_email     text,
  payload     jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by admin or target
CREATE INDEX idx_audit_admin_id ON public.admin_audit_log (admin_id);
CREATE INDEX idx_audit_target ON public.admin_audit_log (target_user_id);
CREATE INDEX idx_audit_created ON public.admin_audit_log (created_at DESC);

-- RLS: no public access. Only service_role can INSERT (server-side).
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own audit entries (admin reads all via service_role).
-- For now, no SELECT policy for authenticated — admin reads via service_role bypass.
-- This keeps the table append-only and invisible to regular users.

COMMENT ON TABLE public.admin_audit_log IS 'Append-only admin action audit trail';
