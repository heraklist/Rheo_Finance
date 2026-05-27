import type { VercelRequest, VercelResponse } from "@vercel/node";

import { cleanEnv } from "./_env.js";

const OWNER = "heraklist";
const REPO = "Rheo_Finance";
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

// Map platform param to asset filename patterns
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  windows: /\.(msi|exe)$/i,
  "windows-update": /\.nsis\.zip$/i,
  android: /\.apk$/i,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const platform = (req.query.platform as string)?.toLowerCase();
  const version = typeof req.query.version === "string" ? req.query.version : undefined;

  if (!platform || !PLATFORM_PATTERNS[platform]) {
    return res.status(400).json({
      error: "Missing or invalid platform. Use ?platform=windows or ?platform=android",
    });
  }

  if (version && !VERSION_PATTERN.test(version)) {
    return res.status(400).json({ error: "Invalid version. Use a semver value like 0.2.24" });
  }

  const token = cleanEnv(process.env.GITHUB_PAT);
  const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    githubHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    // 1. Get requested release. Pinning by version avoids manifest/download race conditions.
    const releasePath = version ? `releases/tags/v${version}` : "releases/latest";
    const releaseRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${releasePath}`, {
      headers: githubHeaders,
    });

    if (!releaseRes.ok) {
      return res.status(502).json({ error: "Failed to fetch release info" });
    }

    const release = await releaseRes.json();

    // 2. Find matching asset
    const pattern = PLATFORM_PATTERNS[platform];
    const asset = release.assets?.find((a: { name: string }) => pattern.test(a.name));

    if (!asset) {
      return res.status(404).json({
        error: `No ${platform} asset found in release ${release.tag_name}`,
      });
    }

    // 3. Get temporary download URL (GitHub returns 302 to S3)
    const assetRes = await fetch(asset.url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Accept: "application/octet-stream",
      },
      redirect: "manual",
    });

    const downloadUrl = assetRes.headers.get("location");

    if (!downloadUrl) {
      return res.status(502).json({ error: "Failed to get download URL" });
    }

    // 4. Set download filename header and redirect user
    res.setHeader("Content-Disposition", `attachment; filename="${asset.name}"`);
    return res.redirect(302, downloadUrl);
  } catch (err) {
    console.error("Download proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
