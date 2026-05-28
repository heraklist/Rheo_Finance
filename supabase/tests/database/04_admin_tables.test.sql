-- Admin tables: deny authenticated/anon access, service_role bypass only
BEGIN;
SELECT plan(6);

-- Insert admin data as service_role (default context, bypasses RLS)
INSERT INTO public.admin_announcements (title, message, type, created_by)
VALUES ('Test Announcement', 'Hello world', 'info', 'admin@test.local');

INSERT INTO public.admin_feature_flags (flag_key, description, enabled)
VALUES ('test_flag', 'A test flag', true);

INSERT INTO public.admin_support_tickets (user_email, subject, status, priority)
VALUES ('regular@test.local', 'Help me', 'open', 'normal');

-- ============================================================
-- Authenticated user sees nothing (RLS blocks, no policies grant access)
-- ============================================================
INSERT INTO auth.users (id, instance_id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000',
        'regular@test.local', crypt('testpass', gen_salt('bf')), 'authenticated', 'authenticated', now(), now(), now());

SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';

SELECT is(
  (SELECT count(*)::int FROM public.admin_announcements),
  0,
  'authenticated user cannot read admin_announcements'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_feature_flags),
  0,
  'authenticated user cannot read admin_feature_flags'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_support_tickets),
  0,
  'authenticated user cannot read admin_support_tickets'
);

-- ============================================================
-- Service_role sees all data (bypass RLS)
-- ============================================================
RESET role;

SELECT is(
  (SELECT count(*)::int FROM public.admin_announcements),
  1,
  'service_role can read admin_announcements'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_feature_flags),
  1,
  'service_role can read admin_feature_flags'
);

SELECT is(
  (SELECT count(*)::int FROM public.admin_support_tickets),
  1,
  'service_role can read admin_support_tickets'
);

SELECT * FROM finish();
ROLLBACK;
