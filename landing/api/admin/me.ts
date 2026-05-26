import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleAdminOptions } from "../_cors.js";
import { verifyAdminOrViewer } from "./_access.js";
import { rateLimited } from "./_rate-limit.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleAdminOptions(req, res)) return;
  if (rateLimited(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const admin = await verifyAdminOrViewer(req);
    return res.status(200).json({ email: admin.email, user_id: admin.id, role: admin.role });
  } catch (err) {
    const status = err instanceof Error && err.message === "Forbidden" ? 403 : 401;
    return res.status(status).json({ error: status === 403 ? "Forbidden" : "Unauthorized" });
  }
}
