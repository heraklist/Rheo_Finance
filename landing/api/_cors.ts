import type { VercelRequest, VercelResponse } from "@vercel/node";

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
