import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminUser } from "./_access.js";
import { rateLimited } from "./_rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res, { maxRequests: 5 })) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await verifyAdminUser(req);

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const to = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const tier = typeof body.tier === "string" ? body.tier : "";

    if (!to || !tier) {
      return res.status(400).json({ error: "email and tier are required" });
    }

    const resendKey = cleanEnv(process.env.RESEND_API_KEY);

    if (!resendKey) {
      return res.status(200).json({ sent: false, reason: "RESEND_API_KEY not configured" });
    }

    const fromEmail = cleanEnv(process.env.NOTIFY_FROM_EMAIL) || "noreply@rheo.finance";

    const subject = `Rheo Finance — Ενημέρωση πρόσβασης`;
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <p style="color: #333;">Γεια σου,</p>
        <p style="color: #333;">Η πρόσβασή σου στο <strong>Rheo Finance</strong> ενημερώθηκε:</p>
        <div style="background: #f8f6f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: bold; color: #b8860b;">
            ${tier.toUpperCase()}
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">
          Αν έχεις ερωτήσεις, απάντησε σε αυτό το email.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">— Rheo Finance</p>
      </div>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromEmail, to, subject, html }),
    });

    if (!emailResponse.ok) {
      const text = await emailResponse.text();
      console.error("Resend failed:", text);
      return res.status(502).json({ sent: false, reason: "Email delivery failed" });
    }

    return res.status(200).json({ sent: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    console.error("Notify error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
