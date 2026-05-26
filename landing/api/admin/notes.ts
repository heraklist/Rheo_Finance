import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminOrViewer, verifyAdminUser } from "./_access.js";
import { rateLimited } from "./_rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res)) return;

  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // GET — list notes for a user (viewers allowed)
  if (req.method === "GET") {
    try {
      await verifyAdminOrViewer(req);

      const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
      if (!email) return res.status(400).json({ error: "email query param required" });

      const response = await fetch(
        `${supabaseUrl}/rest/v1/admin_user_notes?user_email=eq.${encodeURIComponent(email)}&order=created_at.desc&limit=50`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );

      if (!response.ok) {
        console.error("Notes fetch failed:", await response.text());
        return res.status(502).json({ error: "Failed to fetch notes" });
      }

      return res.status(200).json(await response.json());
    } catch (err) {
      if (err instanceof Error && err.message === "Forbidden") {
        return res.status(403).json({ error: "Forbidden" });
      }
      console.error("Notes GET error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // POST — create a note (admin only)
  if (req.method === "POST") {
    try {
      const admin = await verifyAdminUser(req);

      const body = req.body && typeof req.body === "object" ? req.body : {};
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const note = typeof body.note === "string" ? body.note.trim() : "";

      if (!email || !note) {
        return res.status(400).json({ error: "email and note are required" });
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/admin_user_notes`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          user_email: email,
          note,
          admin_email: admin.email,
        }),
      });

      if (!response.ok) {
        console.error("Note create failed:", await response.text());
        return res.status(502).json({ error: "Failed to create note" });
      }

      const created = await response.json();
      return res.status(201).json(Array.isArray(created) ? created[0] : created);
    } catch (err) {
      if (err instanceof Error && err.message === "Forbidden") {
        return res.status(403).json({ error: "Forbidden" });
      }
      console.error("Notes POST error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Method not allowed" });
}
