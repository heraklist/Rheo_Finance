import type { VercelRequest, VercelResponse } from "@vercel/node";

import { handleOptions } from "../_cors.js";
import { verifyAdminUser } from "./_access.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const admin = await verifyAdminUser(req);
    return res.status(200).json({ email: admin.email, user_id: admin.id });
  } catch (err) {
    const status = err instanceof Error && err.message === "Forbidden" ? 403 : 401;
    return res.status(status).json({ error: status === 403 ? "Forbidden" : "Unauthorized" });
  }
}
