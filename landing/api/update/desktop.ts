import type { VercelRequest, VercelResponse } from "@vercel/node";

import { cleanEnv } from "../_env.js";
import { fetchLatestRelease, findReleaseAsset, githubHeaders } from "../_github-release.js";

const DESKTOP_MANIFEST_PATTERN = /^latest-desktop\.json$/i;
const PUBLIC_BASE_URL = cleanEnv(process.env.PUBLIC_LANDING_URL) ?? "https://landing-two-dun-95.vercel.app";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const release = await fetchLatestRelease();
    const manifestAsset = findReleaseAsset(release, DESKTOP_MANIFEST_PATTERN);

    if (!manifestAsset) {
      return res.status(404).json({ error: "Desktop update manifest not found" });
    }

    const manifestRes = await fetch(manifestAsset.url, {
      headers: {
        ...githubHeaders(),
        Accept: "application/octet-stream",
      },
    });

    if (!manifestRes.ok) {
      return res.status(502).json({ error: "Failed to fetch desktop update manifest" });
    }

    const manifest = (await manifestRes.json()) as {
      platforms?: Record<string, { signature?: string; url?: string }>;
      version?: string;
    };
    const version = typeof manifest.version === "string" ? manifest.version : undefined;
    const versionQuery = version ? `&version=${encodeURIComponent(version)}` : "";

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).json({
      ...manifest,
      platforms: {
        ...manifest.platforms,
        "windows-x86_64": {
          ...manifest.platforms?.["windows-x86_64"],
          url: `${PUBLIC_BASE_URL}/api/download?platform=windows-update${versionQuery}`,
        },
      },
    });
  } catch (error) {
    console.error("Desktop update manifest proxy error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
