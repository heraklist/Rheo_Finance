-- Subscriptions table for Stripe billing integration
-- Managed server-side by Vercel webhook (service_role key)
-- Read by Tauri app via RLS (authenticated users read own row)

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for webhook lookups by stripe IDs
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub
  ON public.subscriptions(stripe_subscription_id);

-- RLS: users can read their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (webhook) has full access via bypassing RLS
-- No INSERT/UPDATE/DELETE policies for authenticated — only service_role writes

-- Grant read access to authenticated role
GRANT SELECT ON public.subscriptions TO authenticated;
