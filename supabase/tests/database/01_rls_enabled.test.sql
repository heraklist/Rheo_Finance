-- RLS enabled: every tenant/user-owned table must have RLS enabled
-- Admin tables must also have RLS enabled (deny public by default)
BEGIN;
SELECT plan(17);

-- ============================================================
-- User-owned tables — RLS enabled
-- ============================================================
SELECT policies_are(
  'public', 'books',
  ARRAY['books_select_own', 'books_insert_own', 'books_update_own', 'books_delete_own'],
  'books has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'accounts',
  ARRAY['accounts_select_own', 'accounts_insert_own', 'accounts_update_own', 'accounts_delete_own'],
  'accounts has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'categories',
  ARRAY['categories_select_own', 'categories_insert_own', 'categories_update_own', 'categories_delete_own'],
  'categories has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'tags',
  ARRAY['tags_select_own', 'tags_insert_own', 'tags_update_own', 'tags_delete_own'],
  'tags has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'recurring_templates',
  ARRAY['recurring_templates_select_own', 'recurring_templates_insert_own', 'recurring_templates_update_own', 'recurring_templates_delete_own'],
  'recurring_templates has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'transactions',
  ARRAY['transactions_select_own', 'transactions_insert_own', 'transactions_update_own', 'transactions_delete_own'],
  'transactions has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'plan',
  ARRAY['plan_select_own', 'plan_insert_own', 'plan_update_own', 'plan_delete_own'],
  'plan has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'plan_expense_item',
  ARRAY['plan_expense_item_select_own', 'plan_expense_item_insert_own', 'plan_expense_item_update_own', 'plan_expense_item_delete_own'],
  'plan_expense_item has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'plan_income_item',
  ARRAY['plan_income_item_select_own', 'plan_income_item_insert_own', 'plan_income_item_update_own', 'plan_income_item_delete_own'],
  'plan_income_item has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'coverage_expense',
  ARRAY['coverage_expense_select_own', 'coverage_expense_insert_own', 'coverage_expense_update_own', 'coverage_expense_delete_own'],
  'coverage_expense has full CRUD user-scoped policies'
);

SELECT policies_are(
  'public', 'coverage_income',
  ARRAY['coverage_income_select_own', 'coverage_income_insert_own', 'coverage_income_update_own', 'coverage_income_delete_own'],
  'coverage_income has full CRUD user-scoped policies'
);

-- ============================================================
-- Subscriptions — read-only for authenticated
-- ============================================================
SELECT policies_are(
  'public', 'subscriptions',
  ARRAY['Users can read own subscription'],
  'subscriptions has read-only policy for users'
);

-- ============================================================
-- All user-owned tables have RLS enabled (pg_class check)
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname IN (
       'books', 'accounts', 'categories', 'tags',
       'recurring_templates', 'transactions',
       'plan', 'plan_expense_item', 'plan_income_item',
       'coverage_expense', 'coverage_income', 'subscriptions'
     )
     AND c.relrowsecurity = true),
  12,
  'all 12 user-owned tables have RLS enabled'
);

-- ============================================================
-- Admin tables have RLS enabled
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public'
     AND c.relname IN (
       'admin_announcements', 'admin_feature_flags', 'admin_support_tickets'
     )
     AND c.relrowsecurity = true),
  3,
  'all 3 admin tables have RLS enabled'
);

-- ============================================================
-- Anon role cannot read user-owned tables
-- ============================================================
SELECT is(
  (SELECT count(*)::int
   FROM information_schema.role_table_grants
   WHERE grantee = 'anon'
     AND table_schema = 'public'
     AND table_name IN (
       'books', 'accounts', 'categories', 'tags',
       'recurring_templates', 'transactions',
       'plan', 'plan_expense_item', 'plan_income_item',
       'coverage_expense', 'coverage_income'
     )
     AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  0,
  'anon role has no grants on user-owned tables'
);

-- Anon role cannot read subscriptions
SELECT is(
  (SELECT count(*)::int
   FROM information_schema.role_table_grants
   WHERE grantee = 'anon'
     AND table_schema = 'public'
     AND table_name = 'subscriptions'
     AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  0,
  'anon role has no grants on subscriptions'
);

-- Authenticated cannot INSERT/UPDATE/DELETE subscriptions
SELECT is(
  (SELECT count(*)::int
   FROM information_schema.role_table_grants
   WHERE grantee = 'authenticated'
     AND table_schema = 'public'
     AND table_name = 'subscriptions'
     AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')),
  0,
  'authenticated role cannot write to subscriptions (read-only)'
);

SELECT * FROM finish();
ROLLBACK;
