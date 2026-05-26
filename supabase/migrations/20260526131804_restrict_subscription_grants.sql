-- Rheo Finance: subscriptions are read-only for app users.
-- Server-side Vercel APIs manage this table with the service_role key.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.subscriptions FROM authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
