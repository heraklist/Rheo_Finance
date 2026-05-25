import type { VercelRequest } from "@vercel/node";

import { cleanEnv } from "./_env.js";

export interface VerifiedSupabaseUser {
  id: string;
  email: string | null;
}

function bearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export async function verifySupabaseUser(req: VercelRequest): Promise<VerifiedSupabaseUser> {
  const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
  const supabaseKey = cleanEnv(process.env.SUPABASE_SERVICE_KEY);
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Server misconfigured");
  }

  const token = bearerToken(req);
  if (!token) {
    throw new Error("Unauthorized");
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Unauthorized");
  }

  const user = await response.json();
  if (!user?.id || typeof user.id !== "string") {
    throw new Error("Unauthorized");
  }

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : null,
  };
}
