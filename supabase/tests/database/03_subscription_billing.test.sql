-- Subscription and billing state: constraint enforcement and access control
BEGIN;
SELECT plan(12);

-- ============================================================
-- Create test user in auth.users
-- ============================================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000',
        'billing@test.local', crypt('testpass', gen_salt('bf')), 'authenticated', 'authenticated', now(), now(), now());

-- ============================================================
-- 1. Tier constraint: only valid tiers accepted
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'free', 'active', 'stripe') $$,
  'free tier is valid'
);
DELETE FROM public.subscriptions WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT lives_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'solo', 'active', 'stripe') $$,
  'solo tier is valid'
);
DELETE FROM public.subscriptions WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT lives_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'pro', 'active', 'stripe') $$,
  'pro tier is valid'
);
DELETE FROM public.subscriptions WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT lives_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'team', 'active', 'stripe') $$,
  'team tier is valid'
);
DELETE FROM public.subscriptions WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT throws_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'enterprise', 'active', 'stripe') $$,
  '23514',
  NULL,
  'enterprise tier is rejected by check constraint'
);

-- ============================================================
-- 2. Status constraint: only valid statuses accepted
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'free', 'past_due', 'stripe') $$,
  'past_due status is valid'
);
DELETE FROM public.subscriptions WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT throws_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'free', 'expired', 'stripe') $$,
  '23514',
  NULL,
  'expired status is rejected by check constraint'
);

-- ============================================================
-- 3. Source constraint
-- ============================================================
SELECT lives_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'pro', 'active', 'owner') $$,
  'owner source is valid'
);
DELETE FROM public.subscriptions WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT throws_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'pro', 'active', 'admin_override') $$,
  '23514',
  NULL,
  'admin_override source is rejected by check constraint'
);

-- ============================================================
-- 4. One subscription per user (unique user_id)
-- ============================================================
INSERT INTO public.subscriptions (user_id, tier, status, source)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'free', 'active', 'stripe');

SELECT throws_ok(
  $$ INSERT INTO public.subscriptions (user_id, tier, status, source)
     VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'pro', 'active', 'stripe') $$,
  '23505',
  NULL,
  'duplicate subscription for same user rejected (unique constraint)'
);

-- ============================================================
-- 5. Authenticated user can READ own subscription
-- ============================================================
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';

SELECT is(
  (SELECT tier FROM public.subscriptions LIMIT 1),
  'free',
  'authenticated user can read own subscription tier'
);

-- ============================================================
-- 6. Authenticated user CANNOT write subscription
-- ============================================================
UPDATE public.subscriptions SET tier = 'pro' WHERE user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
SELECT is(
  (SELECT tier FROM public.subscriptions LIMIT 1),
  'free',
  'authenticated user cannot change own tier (no write grant)'
);

RESET role;

SELECT * FROM finish();
ROLLBACK;
