import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { findUserByEmail, normalizeGrantRequest, upsertGrant, writeAuditLog } from "./_grant.js";
import { rateLimited } from "./_rate-limit.js";

function adminToken(req: VercelRequest): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
  return match?.[1]?.trim() || null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res, { maxRequests: 5 })) return;

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

  const grant = normalizeGrantRequest(req.body);
  if ("error" in grant) return res.status(400).json({ error: grant.error });

  try {
    const user = await findUserByEmail(supabaseUrl, serviceKey, grant.email);
    if (!user) return res.status(404).json({ error: "User not found" });

    await upsertGrant({
      supabaseUrl,
      serviceKey,
      userId: user.id,
      tier: grant.tier,
      source: grant.source,
      expiresAt: grant.expiresAt,
      reason: grant.reason,
    });

    await writeAuditLog(supabaseUrl, serviceKey, {
      adminId: "token-auth",
      adminEmail: "cli",
      action: "grant_upsert",
      targetUserId: user.id,
      targetEmail: grant.email,
      payload: { tier: grant.tier, source: grant.source, expiresAt: grant.expiresAt },
    });

    return res.status(200).json({
      user_id: user.id,
      email: grant.email,
      tier: grant.tier,
      source: grant.source,
      expires_at: grant.expiresAt,
    });
  } catch (err) {
    console.error("Admin grant failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
