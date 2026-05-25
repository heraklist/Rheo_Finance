import type { VercelRequest, VercelResponse } from "@vercel/node";

const OWNER = "heraklist";
const REPO = "Rheo_Finance";

// Map platform param to asset filename patterns
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  windows: /\.(msi|exe)$/i,
  android: /\.apk$/i,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const platform = (req.query.platform as string)?.toLowerCase();

  if (!platform || !PLATFORM_PATTERNS[platform]) {
    return res.status(400).json({
      error: "Missing or invalid platform. Use ?platform=windows or ?platform=android",
    });
  }

  const token = process.env.GITHUB_PAT;
  if (!token) {
    return res.status(500).json({ error: "Server misconfigured: missing GITHUB_PAT" });
  }

  try {
    // 1. Get latest release
    const releaseRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (!releaseRes.ok) {
      return res.status(502).json({ error: "Failed to fetch release info" });
    }

    const release = await releaseRes.json();

    // 2. Find matching asset
    const pattern = PLATFORM_PATTERNS[platform];
    const asset = release.assets?.find((a: { name: string }) => pattern.test(a.name));

    if (!asset) {
      return res.status(404).json({
        error: `No ${platform} asset found in latest release (${release.tag_name})`,
      });
    }

    // 3. Get temporary download URL (GitHub returns 302 to S3)
    const assetRes = await fetch(asset.url, {
      headers: {
        Authorization: `Bearer ${token}`,
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
