-- Rheo Finance: tighten RLS policy roles and auth.uid() evaluation.
-- Run after 006_plans_coverage.sql.

DO $$
DECLARE
  policy_target record;
BEGIN
  FOR policy_target IN
    SELECT *
    FROM (VALUES
      ('books', 'books'),
      ('accounts', 'accounts'),
      ('categories', 'categories'),
      ('tags', 'tags'),
      ('recurring_templates', 'recurring_templates'),
      ('transactions', 'transactions'),
      ('plan', 'plan'),
      ('plan_expense_item', 'plan_expense_item'),
      ('plan_income_item', 'plan_income_item'),
      ('coverage_expense', 'coverage_expense'),
      ('coverage_income', 'coverage_income')
    ) AS policies(table_name, policy_prefix)
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_target.policy_prefix || '_select_own',
      policy_target.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_target.policy_prefix || '_insert_own',
      policy_target.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_target.policy_prefix || '_update_own',
      policy_target.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      policy_target.policy_prefix || '_delete_own',
      policy_target.table_name
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = user_id)',
      policy_target.policy_prefix || '_select_own',
      policy_target.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id)',
      policy_target.policy_prefix || '_insert_own',
      policy_target.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id)',
      policy_target.policy_prefix || '_update_own',
      policy_target.table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING ((select auth.uid()) = user_id)',
      policy_target.policy_prefix || '_delete_own',
      policy_target.table_name
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "receipts_select_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_update_own" ON storage.objects;
DROP POLICY IF EXISTS "receipts_delete_own" ON storage.objects;

CREATE POLICY "receipts_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (select auth.uid())::text = (storage.foldername(name))[1]
  );
