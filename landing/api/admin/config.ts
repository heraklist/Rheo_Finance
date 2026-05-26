import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { cleanEnv } from "../_env.js";
import { rateLimited } from "./_rate-limit.js";

const FALLBACK_SUPABASE_URL = "https://jdwetppniotobfsueyzq.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_e2pPJyk82VRW_4136JJMjA_xc6sK7b0";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    supabaseUrl: cleanEnv(process.env.SUPABASE_URL) || FALLBACK_SUPABASE_URL,
    supabasePublishableKey:
      cleanEnv(process.env.VITE_SUPABASE_ANON_KEY) ||
      cleanEnv(process.env.SUPABASE_ANON_KEY) ||
      FALLBACK_SUPABASE_PUBLISHABLE_KEY,
  });
}
