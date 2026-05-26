import type { VercelRequest } from "@vercel/node";

import { verifySupabaseUser } from "../_auth.js";
import { cleanEnv } from "../_env.js";

const DEFAULT_ADMIN_EMAILS = ["heraklis@evochia.gr"];

export interface AdminIdentity {
  id: string;
  email: string;
}

function configuredAdminEmails(): Set<string> {
  const raw = cleanEnv(process.env.ADMIN_EMAILS);
  const emails = raw
    ? raw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ADMIN_EMAILS;
  return new Set(emails);
}

export async function verifyAdminUser(req: VercelRequest): Promise<AdminIdentity> {
  const user = await verifySupabaseUser(req);
  const email = user.email?.toLowerCase();

  if (!email || !configuredAdminEmails().has(email)) {
    throw new Error("Forbidden");
  }

  return { id: user.id, email };
}
