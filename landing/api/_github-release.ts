import { cleanEnv } from "./_env.js";

const OWNER = "heraklist";
const REPO = "Rheo_Finance";

export interface GitHubReleaseAsset {
  name: string;
  url: string;
}

export interface GitHubRelease {
  assets?: GitHubReleaseAsset[];
  tag_name?: string;
}

export const githubHeaders = (): Record<string, string> => {
  const token = cleanEnv(process.env.GITHUB_PAT);
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export async function fetchLatestRelease(): Promise<GitHubRelease> {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
    headers: githubHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch release info: ${response.status}`);
  }

  return (await response.json()) as GitHubRelease;
}

export function findReleaseAsset(release: GitHubRelease, pattern: RegExp): GitHubReleaseAsset | undefined {
  return release.assets?.find((asset) => pattern.test(asset.name));
}

