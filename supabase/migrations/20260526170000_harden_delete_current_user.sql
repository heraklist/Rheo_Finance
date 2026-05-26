-- Harden delete_current_user(): revoke from anon, keep for authenticated only.
-- The function is SECURITY DEFINER by design (needs auth.users access).
-- It correctly scopes to auth.uid() so users can only delete themselves.

REVOKE EXECUTE ON FUNCTION public.delete_current_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_current_user() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
