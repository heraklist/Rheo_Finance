import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Public endpoints — permissive CORS. */
export function applyCors(res: VercelResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  applyCors(res);
  if (req.method !== "OPTIONS") return false;

  res.status(204).end();
  return true;
}

// ---------------------------------------------------------------------------
// Admin-restricted CORS — only the landing domain(s) + localhost dev.
// ---------------------------------------------------------------------------

const ADMIN_ALLOWED_ORIGINS: ReadonlySet<string> = new Set([
  "https://landing-two-dun-95.vercel.app",
  "https://finance.evochia.gr",
  "http://localhost:4321", // Astro dev
  "http://localhost:3000",
]);

function resolveAdminOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin;
  if (typeof origin === "string" && ADMIN_ALLOWED_ORIGINS.has(origin)) return origin;
  return null;
}

export function applyAdminCors(req: VercelRequest, res: VercelResponse): void {
  const allowed = resolveAdminOrigin(req);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", allowed);
    res.setHeader("Vary", "Origin");
  }
  // If origin not in whitelist → no CORS header → browser blocks preflight.
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export function handleAdminOptions(req: VercelRequest, res: VercelResponse): boolean {
  applyAdminCors(req, res);
  if (req.method !== "OPTIONS") return false;

  res.status(204).end();
  return true;
}
