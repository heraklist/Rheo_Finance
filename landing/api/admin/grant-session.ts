import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminUser } from "./_access.js";
import { findUserByEmail, normalizeGrantRequest, upsertGrant } from "./_grant.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const admin = await verifyAdminUser(req);
    const grant = normalizeGrantRequest(req.body);
    if ("error" in grant) return res.status(400).json({ error: grant.error });

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

    return res.status(200).json({
      admin: admin.email,
      user_id: user.id,
      email: grant.email,
      tier: grant.tier,
      source: grant.source,
      expires_at: grant.expiresAt,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.error("Session admin grant failed:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}
