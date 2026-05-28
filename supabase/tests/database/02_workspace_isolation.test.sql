-- Workspace isolation: user A cannot access user B's data
-- Uses raw SQL auth context switching (no supabase_test_helpers dependency)
BEGIN;
SELECT plan(10);

-- ============================================================
-- Helper: create test users in auth.users
-- ============================================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000',
   'user_a@test.local', crypt('testpass', gen_salt('bf')), 'authenticated', 'authenticated', now(), now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000',
   'user_b@test.local', crypt('testpass', gen_salt('bf')), 'authenticated', 'authenticated', now(), now(), now());

-- ============================================================
-- Insert data as service_role (bypasses RLS)
-- ============================================================
INSERT INTO public.books (id, user_id, slug, name)
VALUES
  ('book-a-biz', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'business', 'A Biz'),
  ('book-b-biz', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'business', 'B Biz');

INSERT INTO public.accounts (id, user_id, book_id, name, type)
VALUES
  ('acc-a-1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'book-a-biz', 'A Cash', 'cash'),
  ('acc-b-1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'book-b-biz', 'B Cash', 'cash');

INSERT INTO public.categories (id, user_id, book_id, name, type)
VALUES
  ('cat-a-1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'book-a-biz', 'A Sales', 'income'),
  ('cat-b-1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'book-b-biz', 'B Sales', 'income');

INSERT INTO public.transactions (id, user_id, date, description, book_id, account_id, category_id, payment_method, amount_gross, vat_rate)
VALUES
  ('tx-a-1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-15', 'A transaction', 'book-a-biz', 'acc-a-1', 'cat-a-1', 'Μετρητά', 100.00, 0.24),
  ('tx-b-1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-01-15', 'B transaction', 'book-b-biz', 'acc-b-1', 'cat-b-1', 'Μετρητά', 200.00, 0.24);

-- ============================================================
-- Switch to user A via RLS context
-- ============================================================
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.books),
  1,
  'user_a sees only 1 book'
);

SELECT is(
  (SELECT count(*)::int FROM public.accounts),
  1,
  'user_a sees only 1 account'
);

SELECT is(
  (SELECT count(*)::int FROM public.categories),
  1,
  'user_a sees only 1 category'
);

SELECT is(
  (SELECT count(*)::int FROM public.transactions),
  1,
  'user_a sees only 1 transaction'
);

SELECT is(
  (SELECT description FROM public.transactions LIMIT 1),
  'A transaction',
  'user_a sees own transaction content'
);

-- ============================================================
-- Switch to user B
-- ============================================================
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.books),
  1,
  'user_b sees only 1 book'
);

SELECT is(
  (SELECT count(*)::int FROM public.transactions),
  1,
  'user_b sees only 1 transaction'
);

SELECT is(
  (SELECT description FROM public.transactions LIMIT 1),
  'B transaction',
  'user_b sees own transaction content'
);

-- ============================================================
-- user_b cannot UPDATE or DELETE user_a data
-- ============================================================
UPDATE public.transactions SET description = 'hacked' WHERE id = 'tx-a-1';
-- Switch back to service_role to verify nothing changed
RESET role;
SELECT is(
  (SELECT description FROM public.transactions WHERE id = 'tx-a-1'),
  'A transaction',
  'user_b UPDATE on user_a tx had no effect'
);

-- Re-authenticate as user_b and try DELETE
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
DELETE FROM public.books WHERE id = 'book-a-biz';

RESET role;
SELECT is(
  (SELECT count(*)::int FROM public.books WHERE id = 'book-a-biz'),
  1,
  'user_b DELETE on user_a book had no effect'
);

SELECT * FROM finish();
ROLLBACK;
