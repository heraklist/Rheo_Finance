import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminOrViewer } from "./_access.js";
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
    await verifyAdminOrViewer(req);

    // Optional email filter for per-user audit history
    const emailFilter = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
    const emailClause = emailFilter
      ? `&target_email=eq.${encodeURIComponent(emailFilter)}`
      : "";

    const response = await fetch(
      `${supabaseUrl}/rest/v1/admin_audit_log?select=id,admin_email,action,target_email,payload,created_at&order=created_at.desc&limit=50${emailClause}`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );

    if (!response.ok) {
      console.error("Audit log fetch failed:", await response.text());
      return res.status(502).json({ error: "Failed to fetch audit log" });
    }

    const entries = await response.json();
    return res.status(200).json(entries);
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    console.error("Audit log error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
