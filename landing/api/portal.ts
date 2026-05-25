import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

import { verifySupabaseUser } from "./_auth.js";
import { handleOptions } from "./_cors.js";

/**
 * POST /api/portal
 * Creates a Stripe Customer Portal session for managing subscription.
 * Returns: { url: string }
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

  const stripe = new Stripe(stripeKey);

  try {
    const user = await verifySupabaseUser(req);
    const customerId = await getStripeCustomerId(user.id);
    if (!customerId) {
      return res.status(404).json({ error: "No Stripe customer found for user" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBaseUrl(req)}/#pricing`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.error("Portal session error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: message });
  }
}

function getBaseUrl(req: VercelRequest): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

async function getStripeCustomerId(userId: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Server misconfigured");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&select=stripe_customer_id&limit=1`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch subscription");
  }

  const rows = await response.json();
  const customerId = Array.isArray(rows) ? rows[0]?.stripe_customer_id : null;
  return typeof customerId === "string" && customerId ? customerId : null;
}
