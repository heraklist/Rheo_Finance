import type { VercelRequest } from "@vercel/node";

import { verifySupabaseUser } from "../_auth.js";
import { cleanEnv } from "../_env.js";

const DEFAULT_ADMIN_EMAILS = ["heraklis@evochia.gr"];

export type AdminRole = "admin" | "viewer";

export interface AdminIdentity {
  id: string;
  email: string;
  role: AdminRole;
}

function configuredAdminEmails(): Set<string> {
  const raw = cleanEnv(process.env.ADMIN_EMAILS);
  const emails = raw
    ? raw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;
  return new Set(emails);
}

function configuredViewerEmails(): Set<string> {
  const raw = cleanEnv(process.env.ADMIN_VIEWERS);
  if (!raw) return new Set();
  return new Set(raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
}

/** Full admin access — can read AND write (grants, revoke, notes, notify). */
export async function verifyAdminUser(req: VercelRequest): Promise<AdminIdentity> {
  const user = await verifySupabaseUser(req);
  const email = user.email?.toLowerCase();

  if (!email || !configuredAdminEmails().has(email)) {
    throw new Error("Forbidden");
  }

  return { id: user.id, email, role: "admin" };
}

/** Read-only OR full admin — viewers can list grants, audit logs, notes. */
export async function verifyAdminOrViewer(req: VercelRequest): Promise<AdminIdentity> {
  const user = await verifySupabaseUser(req);
  const email = user.email?.toLowerCase();

  if (!email) throw new Error("Forbidden");

  if (configuredAdminEmails().has(email)) {
    return { id: user.id, email, role: "admin" };
  }

  if (configuredViewerEmails().has(email)) {
    return { id: user.id, email, role: "viewer" };
  }

  throw new Error("Forbidden");
}
