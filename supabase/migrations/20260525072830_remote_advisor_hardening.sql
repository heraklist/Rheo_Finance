-- Close Supabase advisor warnings that are safe to fix in-place.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);
