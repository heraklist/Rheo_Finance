import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { verifyAdminOrViewer, verifyAdminUser } from "./_access.js";
import { rateLimited } from "./_rate-limit.js";

// ---------------------------------------------------------------------------
// Unified SaaS management endpoint — routes by ?type= query param
// GET  ?type=announcements          → list active announcements
// POST ?type=announcements          → create/toggle announcement
// GET  ?type=flags                  → list feature flags
// POST ?type=flags                  → upsert feature flag
// GET  ?type=tickets[&email=]       → list support tickets
// POST ?type=tickets                → create/update ticket
// GET  ?type=export&email=          → GDPR data export for user
// GET  ?type=health                 → system table counts
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function supaFetch(url: string, key: string, path: string, init?: RequestInit) {
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res)) return;

  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const type = typeof req.query.type === "string" ? req.query.type : "";

  try {
    // ───── ANNOUNCEMENTS ─────
    if (type === "announcements") {
      if (req.method === "GET") {
        await verifyAdminOrViewer(req);
        const r = await supaFetch(supabaseUrl, serviceKey, "admin_announcements?order=created_at.desc&limit=50");
        if (!r.ok) return res.status(502).json({ error: "Fetch failed" });
        return res.status(200).json(await r.json());
      }
      if (req.method === "POST") {
        const admin = await verifyAdminUser(req);
        const b = req.body || {};

        // Toggle active status if id provided
        if (b.id && typeof b.active === "boolean") {
          if (!isValidUUID(b.id)) return res.status(400).json({ error: "Invalid id" });
          const r = await supaFetch(supabaseUrl, serviceKey, `admin_announcements?id=eq.${b.id}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ active: b.active }),
          });
          return res.status(r.ok ? 200 : 502).json(r.ok ? { ok: true } : { error: "Update failed" });
        }

        // Create new
        const title = typeof b.title === "string" ? b.title.trim() : "";
        const message = typeof b.message === "string" ? b.message.trim() : "";
        if (!title || !message) return res.status(400).json({ error: "title and message required" });

        const r = await supaFetch(supabaseUrl, serviceKey, "admin_announcements", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            title,
            message,
            type: b.type || "info",
            active: true,
            target_tiers: Array.isArray(b.target_tiers) ? b.target_tiers : null,
            created_by: admin.email,
            expires_at: b.expires_at || null,
          }),
        });
        if (!r.ok) return res.status(502).json({ error: "Create failed" });
        const data = await r.json();
        return res.status(201).json(Array.isArray(data) ? data[0] : data);
      }
    }

    // ───── FEATURE FLAGS ─────
    if (type === "flags") {
      if (req.method === "GET") {
        await verifyAdminOrViewer(req);
        const r = await supaFetch(supabaseUrl, serviceKey, "admin_feature_flags?order=flag_key.asc");
        if (!r.ok) return res.status(502).json({ error: "Fetch failed" });
        return res.status(200).json(await r.json());
      }
      if (req.method === "POST") {
        await verifyAdminUser(req);
        const b = req.body || {};
        const flagKey = typeof b.flag_key === "string" ? b.flag_key.trim() : "";
        if (!flagKey) return res.status(400).json({ error: "flag_key required" });

        const r = await supaFetch(supabaseUrl, serviceKey, "admin_feature_flags?on_conflict=flag_key", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            flag_key: flagKey,
            description: b.description || "",
            enabled: b.enabled ?? false,
            allowed_tiers: Array.isArray(b.allowed_tiers) ? b.allowed_tiers : [],
            allowed_emails: Array.isArray(b.allowed_emails) ? b.allowed_emails : [],
            updated_at: new Date().toISOString(),
          }),
        });
        if (!r.ok) return res.status(502).json({ error: "Upsert failed" });
        const data = await r.json();
        return res.status(200).json(Array.isArray(data) ? data[0] : data);
      }
    }

    // ───── SUPPORT TICKETS ─────
    if (type === "tickets") {
      if (req.method === "GET") {
        await verifyAdminOrViewer(req);
        const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
        const emailClause = email ? `&user_email=eq.${encodeURIComponent(email)}` : "";
        const r = await supaFetch(supabaseUrl, serviceKey, `admin_support_tickets?order=created_at.desc&limit=100${emailClause}`);
        if (!r.ok) return res.status(502).json({ error: "Fetch failed" });
        return res.status(200).json(await r.json());
      }
      if (req.method === "POST") {
        const admin = await verifyAdminUser(req);
        const b = req.body || {};

        // Update status if id provided
        if (b.id && b.status) {
          if (!isValidUUID(b.id)) return res.status(400).json({ error: "Invalid id" });
          const r = await supaFetch(supabaseUrl, serviceKey, `admin_support_tickets?id=eq.${b.id}`, {
            method: "PATCH",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({ status: b.status, assigned_to: b.assigned_to ?? admin.email, updated_at: new Date().toISOString() }),
          });
          return res.status(r.ok ? 200 : 502).json(r.ok ? { ok: true } : { error: "Update failed" });
        }

        // Create new ticket
        const userEmail = typeof b.user_email === "string" ? b.user_email.trim().toLowerCase() : "";
        const subject = typeof b.subject === "string" ? b.subject.trim() : "";
        if (!userEmail || !subject) return res.status(400).json({ error: "user_email and subject required" });

        const r = await supaFetch(supabaseUrl, serviceKey, "admin_support_tickets", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            user_email: userEmail,
            subject,
            status: "open",
            priority: b.priority || "normal",
            assigned_to: admin.email,
          }),
        });
        if (!r.ok) return res.status(502).json({ error: "Create failed" });
        const data = await r.json();
        return res.status(201).json(Array.isArray(data) ? data[0] : data);
      }
    }

    // ───── GDPR DATA EXPORT ─────
    if (type === "export") {
      if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
      await verifyAdminUser(req);
      const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
      if (!email) return res.status(400).json({ error: "email required" });

      // Fetch all user data in parallel
      const [subsR, auditR, notesR, ticketsR] = await Promise.all([
        supaFetch(supabaseUrl, serviceKey, `subscriptions?select=*&user_id=in.(select user_id from subscriptions)&limit=10`),
        supaFetch(supabaseUrl, serviceKey, `admin_audit_log?target_email=eq.${encodeURIComponent(email)}&order=created_at.desc`),
        supaFetch(supabaseUrl, serviceKey, `admin_user_notes?user_email=eq.${encodeURIComponent(email)}&order=created_at.desc`),
        supaFetch(supabaseUrl, serviceKey, `admin_support_tickets?user_email=eq.${encodeURIComponent(email)}&order=created_at.desc`),
      ]);

      // Also look up subscription by email via user list
      const usersR = await fetch(`${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&page=1&per_page=5`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      let userInfo = null;
      let subscription = null;
      if (usersR.ok) {
        const usersData = await usersR.json();
        const users = Array.isArray(usersData.users) ? usersData.users : [];
        const match = users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
        if (match) {
          userInfo = { id: match.id, email: match.email, created_at: match.created_at, last_sign_in_at: match.last_sign_in_at };
          const subR = await supaFetch(supabaseUrl, serviceKey, `subscriptions?user_id=eq.${match.id}`);
          if (subR.ok) {
            const subs = await subR.json();
            subscription = Array.isArray(subs) && subs.length > 0 ? subs[0] : null;
          }
        }
      }

      return res.status(200).json({
        exported_at: new Date().toISOString(),
        email,
        user: userInfo,
        subscription,
        audit_log: auditR.ok ? await auditR.json() : [],
        notes: notesR.ok ? await notesR.json() : [],
        tickets: ticketsR.ok ? await ticketsR.json() : [],
      });
    }

    // ───── SYSTEM HEALTH ─────
    if (type === "health") {
      if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
      await verifyAdminOrViewer(req);

      // Count rows in key tables
      const tables = ["subscriptions", "admin_audit_log", "admin_user_notes", "admin_announcements", "admin_feature_flags", "admin_support_tickets"];
      const counts: Record<string, number> = {};

      await Promise.all(tables.map(async (t) => {
        const r = await supaFetch(supabaseUrl, serviceKey, `${t}?select=count`, {
          headers: { Prefer: "count=exact" },
        });
        // Supabase returns count in content-range header
        const range = r.headers.get("content-range");
        counts[t] = range ? parseInt(range.split("/")[1] || "0", 10) : 0;
      }));

      // Auth user count
      let authUsers = 0;
      const usersR = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      if (usersR.ok) {
        const data = await usersR.json();
        // total is in the response or we count
        authUsers = typeof data.total === "number" ? data.total : (Array.isArray(data.users) ? data.users.length : 0);
      }

      return res.status(200).json({ auth_users: authUsers, tables: counts });
    }

    return res.status(400).json({ error: "Unknown type. Use: announcements, flags, tickets, export, health" });
  } catch (err) {
    if (err instanceof Error && err.message === "Forbidden") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.error("SaaS endpoint error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
