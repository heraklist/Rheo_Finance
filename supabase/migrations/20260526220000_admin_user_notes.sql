-- Admin user notes for support tracking
CREATE TABLE IF NOT EXISTS admin_user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  note text NOT NULL,
  admin_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_user_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_user_notes_email ON admin_user_notes(user_email);
