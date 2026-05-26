import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminUser } from "./_access.js";
import { rateLimited } from "./_rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    await verifyAdminUser(req);

    // Fetch all subscriptions (service_role bypasses RLS).
    const response = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?select=user_id,tier,source,status,expires_at,grant_reason,cancel_at_period_end,updated_at&order=updated_at.desc&limit=100`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("List grants failed:", text);
      return res.status(502).json({ error: "Failed to fetch subscriptions" });
    }

    const subscriptions = await response.json();

    // Enrich with user emails via admin API.
    // Batch: fetch all users, then map by id.
    const emailMap = new Map<string, string>();
    const lastLoginMap = new Map<string, string | null>();
    const createdAtMap = new Map<string, string | null>();

    // Supabase admin API doesn't support bulk ID lookup, so we fetch page by page.
    // For <100 subs this is fine.
    const usersRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=100`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    interface AuthUser {
      id: string;
      email?: string;
      last_sign_in_at?: string;
      created_at?: string;
    }

    if (usersRes.ok) {
      const usersData = await usersRes.json();
      const users: AuthUser[] = Array.isArray(usersData.users) ? usersData.users : [];
      for (const u of users) {
        if (u.id && u.email) emailMap.set(u.id, u.email);
      }
      // Build last-login map
      for (const u of users) {
        if (u.id) {
          lastLoginMap.set(u.id, u.last_sign_in_at ?? null);
          createdAtMap.set(u.id, u.created_at ?? null);
        }
      }
    }

    const enriched = subscriptions.map((s: Record<string, unknown>) => ({
      ...s,
      email: emailMap.get(s.user_id as string) ?? "—",
      last_sign_in_at: lastLoginMap.get(s.user_id as string) ?? null,
      user_created_at: createdAtMap.get(s.user_id as string) ?? null,
    }));

    return res.status(200).json(enriched);
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    console.error("List grants error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
