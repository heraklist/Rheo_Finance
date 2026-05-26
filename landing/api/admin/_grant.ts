type SubscriptionTier = "free" | "solo" | "pro" | "team";
type SubscriptionSource = "manual" | "tester" | "owner";

export interface AdminUser {
  id: string;
  email?: string;
}

export interface GrantRequest {
  email: string;
  tier: SubscriptionTier;
  source: SubscriptionSource;
  expiresAt: string | null;
  reason: string | null;
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

export function normalizeTier(value: unknown): SubscriptionTier | null {
  if (value === "free" || value === "solo" || value === "pro" || value === "team") return value;
  return null;
}

export function normalizeSource(value: unknown): SubscriptionSource {
  if (value === "tester" || value === "owner") return value;
  return "manual";
}

export function normalizeOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function normalizeGrantRequest(body: unknown): GrantRequest | { error: string } {
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = normalizeEmail(payload.email);
  const tier = normalizeTier(payload.tier);
  const source = normalizeSource(payload.source);
  const expiresAt = normalizeOptionalDate(payload.expiresAt);
  const reason = typeof payload.reason === "string" ? payload.reason.trim() || null : null;

  if (!email || !tier) {
    return { error: "Body must include email and tier" };
  }

  if (source === "owner" && tier !== "team") {
    return { error: "owner grants must use team tier" };
  }

  return { email, tier, source, expiresAt, reason };
}

export async function findUserByEmail(
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

export async function upsertGrant(params: {
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
