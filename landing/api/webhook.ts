import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * POST /api/webhook
 * Stripe webhook handler.
 * Updates subscription status in Supabase when Stripe events fire.
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY (service_role — server-side only, never in client)
 */

// Vercel needs raw body for Stripe signature verification
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

type SubscriptionTier = "free" | "solo" | "pro" | "team";
type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

interface SubscriptionUpsert {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  tier: SubscriptionTier;
  source: "stripe";
  status: SubscriptionStatus;
  current_period_end: string;
  cancel_at_period_end: boolean;
  updated_at: string;
}

async function upsertSubscription(data: SubscriptionUpsert): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${data.user_id}`,
    {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const existing = await response.json();
  const isUpdate = Array.isArray(existing) && existing.length > 0;

  const endpoint = isUpdate
    ? `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${data.user_id}`
    : `${supabaseUrl}/rest/v1/subscriptions`;

  const res = await fetch(endpoint, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed: ${res.status} ${text}`);
  }
}

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    default:
      return "incomplete";
  }
}

function mapSubscriptionTier(value: unknown): Exclude<SubscriptionTier, "free"> {
  if (value === "solo" || value === "pro" || value === "team") return value;
  return "pro";
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): string {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (!periodEnd) {
    throw new Error(`Subscription ${subscription.id} has no current period end`);
  }

  return new Date(periodEnd * 1000).toISOString();
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type !== "subscription_details") return null;

  const subscription = parent.subscription_details?.subscription;
  if (!subscription) return null;

  return typeof subscription === "string" ? subscription : subscription.id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return res.status(500).json({ error: "Missing Stripe configuration" });
  }

  const stripe = new Stripe(stripeKey);

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || !session.subscription) break;

        // Fetch full subscription details
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          tier: mapSubscriptionTier(sub.metadata?.tier),
          source: "stripe",
          status: mapStripeStatus(sub.status),
          current_period_end: subscriptionPeriodEnd(sub),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        const isCanceled = sub.status === "canceled" || sub.status === "unpaid";
        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          tier: isCanceled ? "free" : mapSubscriptionTier(sub.metadata?.tier),
          source: "stripe",
          status: mapStripeStatus(sub.status),
          current_period_end: subscriptionPeriodEnd(sub),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoiceSubscriptionId(invoice);
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await upsertSubscription({
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          tier: mapSubscriptionTier(sub.metadata?.tier), // keep paid tier until actually canceled
          source: "stripe",
          status: "past_due",
          current_period_end: subscriptionPeriodEnd(sub),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
