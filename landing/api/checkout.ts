import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

import { verifySupabaseUser } from "./_auth.js";
import { handleOptions } from "./_cors.js";
import { cleanEnv } from "./_env.js";

type CheckoutTier = "solo" | "pro" | "team";
type CheckoutInterval = "monthly" | "annual";

const PRICE_ENV: Record<CheckoutTier, Record<CheckoutInterval, string>> = {
  solo: {
    monthly: "STRIPE_PRICE_SOLO_MONTHLY",
    annual: "STRIPE_PRICE_SOLO_ANNUAL",
  },
  pro: {
    monthly: "STRIPE_PRICE_PRO_MONTHLY",
    annual: "STRIPE_PRICE_PRO_ANNUAL",
  },
  team: {
    monthly: "STRIPE_PRICE_TEAM_MONTHLY",
    annual: "STRIPE_PRICE_TEAM_ANNUAL",
  },
};

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session for subscription.
 *
 * Billing is intentionally disabled by default while Rheo's commercial pricing
 * is still being finalized. Set BILLING_ENABLED=true and the matching Stripe
 * price environment variables before exposing this endpoint in production.
 *
 * Body: { tier: "solo" | "pro" | "team", interval: "monthly" | "annual" }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (cleanEnv(process.env.BILLING_ENABLED) !== "true") {
    return res.status(503).json({
      error: "Billing is not enabled yet.",
      code: "BILLING_DISABLED",
    });
  }

  const stripeKey = cleanEnv(process.env.STRIPE_SECRET_KEY);
  if (!stripeKey) {
    return res.status(500).json({ error: "Server misconfigured: missing STRIPE_SECRET_KEY" });
  }

  const { tier, interval } = req.body ?? {};

  if (!isCheckoutTier(tier)) {
    return res.status(400).json({ error: 'tier must be "solo", "pro", or "team"' });
  }

  if (!isCheckoutInterval(interval)) {
    return res.status(400).json({ error: 'interval must be "monthly" or "annual"' });
  }

  const priceId = cleanEnv(process.env[PRICE_ENV[tier][interval]]);
  if (!priceId) {
    return res.status(500).json({ error: `Server misconfigured: missing ${PRICE_ENV[tier][interval]}` });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const user = await verifySupabaseUser(req);
    if (!user.email) {
      return res.status(400).json({ error: "Authenticated user has no email" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id, interval, tier },
      success_url: `${getBaseUrl(req)}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl(req)}/#pricing`,
      subscription_data: {
        metadata: { userId: user.id, interval, tier },
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.error("Checkout session error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

function isCheckoutTier(value: unknown): value is CheckoutTier {
  return value === "solo" || value === "pro" || value === "team";
}

function isCheckoutInterval(value: unknown): value is CheckoutInterval {
  return value === "monthly" || value === "annual";
}
