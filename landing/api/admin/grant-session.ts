import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminUser } from "./_access.js";
import { findUserByEmail, normalizeGrantRequest, upsertGrant, writeAuditLog } from "./_grant.js";
import { rateLimited } from "./_rate-limit.js";

interface AdminInfo {
  id: string;
  email: string;
}

function extractBearerToken(req: VercelRequest): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
  return match?.[1]?.trim() || null;
}

async function resolveAdmin(req: VercelRequest): Promise<AdminInfo> {
  try {
    const admin = await verifyAdminUser(req);
    return { id: admin.id, email: admin.email };
  } catch {
    // Fall through to token auth for CLI/admin automation.
  }

  const configuredToken = cleanEnv(process.env.ADMIN_GRANT_TOKEN);
  const token = extractBearerToken(req);
  if (configuredToken && token === configuredToken) {
    return { id: "token-auth", email: "cli" };
  }

  throw new Error("Unauthorized");
}

async function sendNotificationEmail(
  to: string,
  tier: string,
  resendKey: string,
  fromEmail: string,
): Promise<boolean> {
  try {
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
        <p style="color:#333;">Γεια σου,</p>
        <p style="color:#333;">Η πρόσβασή σου στο <strong>Rheo Finance</strong> ενημερώθηκε:</p>
        <div style="background:#f8f6f0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#b8860b;">${tier.toUpperCase()}</p>
        </div>
        <p style="color:#666;font-size:14px;">Αν έχεις ερωτήσεις, απάντησε σε αυτό το email.</p>
        <p style="color:#999;font-size:12px;margin-top:24px;">- Rheo Finance</p>
      </div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: "Rheo Finance - Ενημέρωση πρόσβασης",
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res, { maxRequests: 5 })) return;

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
    const admin = await resolveAdmin(req);
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

    await writeAuditLog(supabaseUrl, serviceKey, {
      adminId: admin.id,
      adminEmail: admin.email,
      action: "grant_upsert",
      targetUserId: user.id,
      targetEmail: grant.email,
      payload: { tier: grant.tier, source: grant.source, expiresAt: grant.expiresAt },
    });

    let notified = false;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (body.notify === true) {
      const resendKey = cleanEnv(process.env.RESEND_API_KEY);
      if (resendKey) {
        const fromEmail = cleanEnv(process.env.NOTIFY_FROM_EMAIL) || "noreply@rheo.finance";
        notified = await sendNotificationEmail(grant.email, grant.tier, resendKey, fromEmail);
      }
    }

    return res.status(200).json({
      admin: admin.email,
      user_id: user.id,
      email: grant.email,
      tier: grant.tier,
      source: grant.source,
      expires_at: grant.expiresAt,
      notified,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("Admin grant failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
