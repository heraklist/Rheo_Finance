import type { VercelRequest, VercelResponse } from "@vercel/node";

import { verifySupabaseUser } from "./_auth.js";
import { handleOptions } from "./_cors.js";

/**
 * GET /api/subscription?userId=<uuid>
 * Returns the subscription status for a user.
 * The Tauri app calls this to check the current tier.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const user = await verifySupabaseUser(req);
    const requestedUserId = req.query.userId as string | undefined;
    if (requestedUserId && requestedUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=tier,status,source,current_period_end,cancel_at_period_end,expires_at`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      },
    );

    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch subscription" });
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      // No subscription record → free tier
      return res.status(200).json({
        tier: "free",
        status: "active",
        source: "stripe",
        current_period_end: null,
        cancel_at_period_end: false,
        expires_at: null,
      });
    }

    const sub = rows[0];
    const expiresAt = sub.expires_at ? Date.parse(sub.expires_at) : Number.NaN;

    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      return res.status(200).json({
        tier: "free",
        status: "canceled",
        source: sub.source || "manual",
        current_period_end: sub.current_period_end,
        cancel_at_period_end: true,
        expires_at: sub.expires_at,
      });
    }

    // Set cache headers — app can cache for 5 minutes
    res.setHeader("Cache-Control", "private, max-age=300");

    return res.status(200).json({
      tier: sub.tier || "free",
      status: sub.status || "active",
      source: sub.source || "stripe",
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      expires_at: sub.expires_at || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.error("Subscription check error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
