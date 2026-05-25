import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";

type SubscriptionTier = "free" | "solo" | "pro" | "team";
type SubscriptionSource = "manual" | "tester" | "owner";

interface AdminUser {
  id: string;
  email?: string;
}

function adminToken(req: VercelRequest): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
  return match?.[1]?.trim() || null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

function normalizeTier(value: unknown): SubscriptionTier | null {
  if (value === "free" || value === "solo" || value === "pro" || value === "team") return value;
  return null;
}

function normalizeSource(value: unknown): SubscriptionSource {
  if (value === "tester" || value === "owner") return value;
  return "manual";
}

function normalizeOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

async function findUserByEmail(
  supabaseUrl: string,
  serviceKey: string,
  email: string,
): Promise<AdminUser | null> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=10`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase admin user lookup failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const users = Array.isArray(data.users) ? (data.users as AdminUser[]) : [];
  return users.find((user) => user.email?.toLowerCase() === email) ?? null;
}

async function upsertGrant(params: {
  supabaseUrl: string;
  serviceKey: string;
  userId: string;
  tier: SubscriptionTier;
  source: SubscriptionSource;
  expiresAt: string | null;
  reason: string | null;
}): Promise<void> {
  const response = await fetch(`${params.supabaseUrl}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: "POST",
    headers: {
      apikey: params.serviceKey,
      Authorization: `Bearer ${params.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: params.userId,
      tier: params.tier,
      source: params.source,
      status: params.tier === "free" ? "canceled" : "active",
      expires_at: params.expiresAt,
      grant_reason: params.reason,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase grant upsert failed: ${response.status} ${text}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configuredAdminToken = cleanEnv(process.env.ADMIN_GRANT_TOKEN);
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);

  if (!configuredAdminToken || !supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  if (adminToken(req) !== configuredAdminToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const email = normalizeEmail(req.body?.email);
  const tier = normalizeTier(req.body?.tier);
  const source = normalizeSource(req.body?.source);
  const expiresAt = normalizeOptionalDate(req.body?.expiresAt);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() || null : null;

  if (!email || !tier) {
    return res.status(400).json({ error: "Body must include email and tier" });
  }

  if (source === "owner" && tier !== "team") {
    return res.status(400).json({ error: "owner grants must use team tier" });
  }

  try {
    const user = await findUserByEmail(supabaseUrl, serviceKey, email);
    if (!user) return res.status(404).json({ error: "User not found" });

    await upsertGrant({
      supabaseUrl,
      serviceKey,
      userId: user.id,
      tier,
      source,
      expiresAt,
      reason,
    });

    return res.status(200).json({
      user_id: user.id,
      email,
      tier,
      source,
      expires_at: expiresAt,
    });
  } catch (err) {
    console.error("Admin grant failed:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
