-- Rheo Finance: explicit Data API grants for authenticated app tables.
-- Required for new Supabase projects where public tables are no longer
-- exposed to PostgREST/GraphQL automatically. RLS policies remain the
-- data isolation boundary.

GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON TABLE
  public.books,
  public.accounts,
  public.categories,
  public.tags,
  public.recurring_templates,
  public.transactions,
  public.plan,
  public.plan_expense_item,
  public.plan_income_item,
  public.coverage_expense,
  public.coverage_income
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.books,
  public.accounts,
  public.categories,
  public.tags,
  public.recurring_templates,
  public.transactions,
  public.plan,
  public.plan_expense_item,
  public.plan_income_item,
  public.coverage_expense,
  public.coverage_income
TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
