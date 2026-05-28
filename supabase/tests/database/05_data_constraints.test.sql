-- Data constraints: check constraints, generated columns, and business rules
BEGIN;
SELECT plan(11);

-- ============================================================
-- Create test user and reference data
-- ============================================================
SELECT tests.create_supabase_user('constraint_user', 'constraint@test.local');

INSERT INTO public.books (id, user_id, slug, name)
VALUES ('book-c-biz', tests.get_supabase_uid('constraint_user'), 'business', 'Test Biz');

INSERT INTO public.accounts (id, user_id, book_id, name, type)
VALUES ('acc-c-1', tests.get_supabase_uid('constraint_user'), 'book-c-biz', 'Cash', 'cash');

INSERT INTO public.categories (id, user_id, book_id, name, type)
VALUES ('cat-c-1', tests.get_supabase_uid('constraint_user'), 'book-c-biz', 'Sales', 'income');

-- ============================================================
-- 1. Books slug constraint: only business/personal
-- ============================================================
SELECT throws_ok(
  $$ INSERT INTO public.books (id, user_id, slug, name)
     VALUES ('book-bad', tests.get_supabase_uid('constraint_user'), 'savings', 'Bad') $$,
  '23514',
  NULL,
  'books.slug rejects values outside business/personal'
);

-- ============================================================
-- 2. Account type constraint: only cash/bank/card
-- ============================================================
SELECT throws_ok(
  $$ INSERT INTO public.accounts (id, user_id, book_id, name, type)
     VALUES ('acc-bad', tests.get_supabase_uid('constraint_user'), 'book-c-biz', 'Crypto', 'crypto') $$,
  '23514',
  NULL,
  'accounts.type rejects invalid values'
);

-- ============================================================
-- 3. Category type constraint: income/expense/reserve/transfer
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.categories (id, user_id, book_id, name, type)
     VALUES ('cat-c-exp', tests.get_supabase_uid('constraint_user'), 'book-c-biz', 'Food', 'expense') $$,
  'expense category type is valid'
);

SELECT throws_ok(
  $$ INSERT INTO public.categories (id, user_id, book_id, name, type)
     VALUES ('cat-bad', tests.get_supabase_uid('constraint_user'), 'book-c-biz', 'Bad', 'refund') $$,
  '23514',
  NULL,
  'categories.type rejects invalid values'
);

-- ============================================================
-- 4. Transaction payment_method constraint
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.transactions (id, user_id, date, description, book_id, account_id, category_id, payment_method, amount_gross, vat_rate)
     VALUES ('tx-c-1', tests.get_supabase_uid('constraint_user'), '2026-01-01', 'Test', 'book-c-biz', 'acc-c-1', 'cat-c-1', 'IRIS', 50.00, 0.24) $$,
  'IRIS payment method is valid'
);

SELECT throws_ok(
  $$ INSERT INTO public.transactions (id, user_id, date, description, book_id, account_id, category_id, payment_method, amount_gross, vat_rate)
     VALUES ('tx-bad', tests.get_supabase_uid('constraint_user'), '2026-01-01', 'Bad', 'book-c-biz', 'acc-c-1', 'cat-c-1', 'Bitcoin', 50.00, 0.24) $$,
  '23514',
  NULL,
  'transactions.payment_method rejects invalid values'
);

-- ============================================================
-- 5. Generated VAT columns are computed correctly
-- ============================================================
-- amount_gross = 124, vat_rate = 0.24
-- net = 124 / 1.24 = 100, vat = 124 - 100 = 24
INSERT INTO public.transactions (id, user_id, date, description, book_id, account_id, category_id, payment_method, amount_gross, vat_rate)
VALUES ('tx-vat', tests.get_supabase_uid('constraint_user'), '2026-02-01', 'VAT test', 'book-c-biz', 'acc-c-1', 'cat-c-1', 'Μετρητά', 124.00, 0.24);

SELECT is(
  (SELECT amount_net::numeric FROM public.transactions WHERE id = 'tx-vat'),
  100.00::numeric,
  'generated amount_net = gross / (1 + vat_rate)'
);

SELECT is(
  (SELECT amount_vat::numeric FROM public.transactions WHERE id = 'tx-vat'),
  24.00::numeric,
  'generated amount_vat = gross - net'
);

-- ============================================================
-- 6. Recurring template frequency constraint
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.recurring_templates (id, user_id, description, book_id, account_id, category_id, amount_gross, frequency, start_date)
     VALUES ('rec-1', tests.get_supabase_uid('constraint_user'), 'Monthly rent', 'book-c-biz', 'acc-c-1', 'cat-c-1', 500.00, 'monthly', '2026-01-01') $$,
  'monthly frequency is valid'
);

SELECT throws_ok(
  $$ INSERT INTO public.recurring_templates (id, user_id, description, book_id, account_id, category_id, amount_gross, frequency, start_date)
     VALUES ('rec-bad', tests.get_supabase_uid('constraint_user'), 'Bad', 'book-c-biz', 'acc-c-1', 'cat-c-1', 100.00, 'biweekly', '2026-01-01') $$,
  '23514',
  NULL,
  'recurring_templates.frequency rejects invalid values'
);

-- ============================================================
-- 7. Plan status constraint
-- ============================================================
SELECT throws_ok(
  $$ INSERT INTO public.plan (id, user_id, book_id, name, status)
     VALUES ('plan-bad', tests.get_supabase_uid('constraint_user'), 'book-c-biz', 'Bad', 'archived') $$,
  '23514',
  NULL,
  'plan.status rejects invalid values'
);

SELECT * FROM finish();
ROLLBACK;
