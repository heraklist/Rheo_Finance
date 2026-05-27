-- Announcements / banners for all users
CREATE TABLE IF NOT EXISTS admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  active boolean NOT NULL DEFAULT true,
  target_tiers text[] DEFAULT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

-- Feature flags per tier / per user
CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  description text DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  allowed_tiers text[] DEFAULT '{}',
  allowed_emails text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_feature_flags ENABLE ROW LEVEL SECURITY;

-- Support tickets
CREATE TABLE IF NOT EXISTS admin_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  assigned_to text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_support_tickets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON admin_support_tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON admin_support_tickets(status);
