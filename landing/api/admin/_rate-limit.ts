import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works within a Vercel function's warm period (~5 min).
 * Cold starts reset the window — acceptable for admin endpoints
 * where the threat model is brute-force from a single origin.
 */

interface WindowEntry {
  timestamps: number[];
}

const windows = new Map<string, WindowEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10; // 10 requests per minute

function clientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}

function pruneOld(entry: WindowEntry, now: number, windowMs: number): void {
  const cutoff = now - windowMs;
  // Remove timestamps older than the window
  while (entry.timestamps.length > 0 && entry.timestamps[0] < cutoff) {
    entry.timestamps.shift();
  }
}

/**
 * Returns `true` if the request should be **blocked** (rate limit exceeded).
 * Returns `false` if the request is within limits (proceed normally).
 *
 * When blocked, sends a 429 response automatically.
 */
export function rateLimited(
  req: VercelRequest,
  res: VercelResponse,
  options?: { windowMs?: number; maxRequests?: number },
): boolean {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const ip = clientIp(req);
  const now = Date.now();

  let entry = windows.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(ip, entry);
  }

  pruneOld(entry, now, windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const retryAfter = Math.ceil((entry.timestamps[0] + windowMs - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests. Try again later." });
    return true;
  }

  entry.timestamps.push(now);

  // Periodic cleanup: drop IPs with no recent activity
  if (windows.size > 500) {
    for (const [key, val] of windows) {
      pruneOld(val, now, windowMs);
      if (val.timestamps.length === 0) windows.delete(key);
    }
  }

  return false;
}
