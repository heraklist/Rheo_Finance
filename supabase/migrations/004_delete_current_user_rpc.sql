-- Delete the currently authenticated user.
-- The app calls this through Supabase RPC after a double confirmation.

CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM auth.users
  WHERE id = current_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_current_user() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
