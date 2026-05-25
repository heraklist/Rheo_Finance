import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

import { verifySupabaseUser } from "./_auth.js";
import { handleOptions } from "./_cors.js";

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session for subscription.
 *
 * Body: { email: string, plan: "monthly" | "annual", userId: string }
 * Redirects to Stripe Checkout.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: "Server misconfigured: missing STRIPE_SECRET_KEY" });
  }

  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY;
  const priceAnnual = process.env.STRIPE_PRICE_ANNUAL;
  if (!priceMonthly || !priceAnnual) {
    return res.status(500).json({ error: "Server misconfigured: missing Stripe price IDs" });
  }

  const { plan } = req.body ?? {};

  if (plan !== "monthly" && plan !== "annual") {
    return res.status(400).json({ error: 'plan must be "monthly" or "annual"' });
  }

  const stripe = new Stripe(stripeKey);

  try {
    const user = await verifySupabaseUser(req);
    if (!user.email) {
      return res.status(400).json({ error: "Authenticated user has no email" });
    }

    const priceId = plan === "annual" ? priceAnnual : priceMonthly;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id, plan, tier: "solo" },
      success_url: `${getBaseUrl(req)}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl(req)}/#pricing`,
      subscription_data: {
        metadata: { userId: user.id, plan, tier: "solo" },
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
