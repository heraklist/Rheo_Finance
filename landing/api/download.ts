import type { VercelRequest, VercelResponse } from "@vercel/node";

import { cleanEnv } from "./_env.js";

const OWNER = "heraklist";
const REPO = "Rheo_Finance";
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const PUBLIC_BASE_URL = cleanEnv(process.env.PUBLIC_LANDING_URL) ?? "https://landing-two-dun-95.vercel.app";
const MANIFEST_PATTERNS: Record<string, RegExp> = {
  desktop: /^latest-desktop\.json$/i,
  android: /^latest-android\.json$/i,
};

// Map platform param to asset filename patterns
const PLATFORM_PATTERNS: Record<string, RegExp> = {
  windows: /\.(msi|exe)$/i,
  android: /\.apk$/i,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const platform = (req.query.platform as string)?.toLowerCase();
  const manifest = (req.query.manifest as string)?.toLowerCase();
  const version = typeof req.query.version === "string" ? req.query.version : undefined;

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
    const release = await fetchRelease(version, githubHeaders);

    if (manifest) {
      return await sendUpdateManifest(res, manifest, release, githubHeaders);
    }

    if (!platform || !PLATFORM_PATTERNS[platform]) {
      return res.status(400).json({
        error: "Missing or invalid platform. Use ?platform=windows or ?platform=android",
      });
    }

    const pattern = PLATFORM_PATTERNS[platform];
    const asset = release.assets?.find((a: { name: string }) => pattern.test(a.name));

    if (!asset) {
      return res.status(404).json({
        error: `No ${platform} asset found in release ${release.tag_name}`,
      });
    }

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

    res.setHeader("Content-Disposition", `attachment; filename="${asset.name}"`);
    return res.redirect(302, downloadUrl);
  } catch (err) {
    console.error("Download proxy error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function fetchRelease(version: string | undefined, githubHeaders: Record<string, string>) {
  const releasePath = version ? `releases/tags/v${version}` : "releases/latest";
  const releaseRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${releasePath}`, {
    headers: githubHeaders,
  });

  if (!releaseRes.ok) {
    throw new Error(`Failed to fetch release info: ${releaseRes.status}`);
  }

  return releaseRes.json();
}

async function sendUpdateManifest(
  res: VercelResponse,
  manifest: string,
  release: { assets?: Array<{ name: string; url: string }> },
  githubHeaders: Record<string, string>,
) {
  const pattern = MANIFEST_PATTERNS[manifest];
  if (!pattern) {
    return res.status(400).json({ error: "Invalid manifest. Use ?manifest=desktop or ?manifest=android" });
  }

  const asset = release.assets?.find((candidate) => pattern.test(candidate.name));
  if (!asset) {
    return res.status(404).json({ error: `${manifest} update manifest not found` });
  }

  const manifestRes = await fetch(asset.url, {
    headers: {
      ...githubHeaders,
      Accept: "application/octet-stream",
    },
  });

  if (!manifestRes.ok) {
    return res.status(502).json({ error: `Failed to fetch ${manifest} update manifest` });
  }

  const body = (await manifestRes.json()) as {
    platforms?: Record<string, { signature?: string; url?: string }>;
    url?: string;
    version?: string;
  };
  const manifestVersion = typeof body.version === "string" ? body.version : undefined;
  const versionQuery = manifestVersion ? `&version=${encodeURIComponent(manifestVersion)}` : "";

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (manifest === "android") {
    return res.status(200).json({
      ...body,
      url: `${PUBLIC_BASE_URL}/api/download?platform=android${versionQuery}`,
    });
  }

  return res.status(200).json({
    ...body,
    platforms: {
      ...body.platforms,
      "windows-x86_64": {
        ...body.platforms?.["windows-x86_64"],
        url: `${PUBLIC_BASE_URL}/api/download?platform=windows${versionQuery}`,
      },
    },
  });
}
