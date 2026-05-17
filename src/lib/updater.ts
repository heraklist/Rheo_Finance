import { getUpdaterGitHubToken } from "@/lib/updaterToken";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";

export type UpdateCheckStatus =
  | "current"
  | "available"
  | "needs-token"
  | "not-configured"
  | "unsupported"
  | "error";

export interface UpdateCheckResult {
  status: UpdateCheckStatus;
  message: string;
}

interface GitHubReleaseAsset {
  name: string;
  url: string;
}

interface GitHubLatestRelease {
  assets: GitHubReleaseAsset[];
  tag_name: string;
}

interface TauriLatestJson {
  version?: string;
}

const GITHUB_API_BASE = "https://api.github.com/repos/heraklist/Rheo_Finance";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isMissingUpdaterConfig(message: string): boolean {
  return /endpoints?|pubkey|public key|signature/i.test(message);
}

function isGitHubAccessError(message: string): boolean {
  return /401|403|404|unauthori[sz]ed|forbidden|not found|private/i.test(message);
}

function createUpdaterHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/octet-stream, application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function compareVersions(a: string, b: string): number {
  const left = a.replace(/^v/, "").split(".").map(Number);
  const right = b.replace(/^v/, "").split(".").map(Number);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index++) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    if (leftPart > rightPart) return 1;
    if (leftPart < rightPart) return -1;
  }

  return 0;
}

async function fetchGitHubJson<T>(url: string, token: string, accept: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      ...createUpdaterHeaders(token),
      Accept: accept,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub updater request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function checkPrivateGitHubUpdate(token: string): Promise<UpdateCheckResult> {
  const release = await fetchGitHubJson<GitHubLatestRelease>(
    `${GITHUB_API_BASE}/releases/latest`,
    token,
    "application/vnd.github+json",
  );
  const latestAsset = release.assets.find((asset) => asset.name === "latest.json");

  if (!latestAsset) {
    return {
      status: "error",
      message: "Δεν βρέθηκε latest.json στο τελευταίο GitHub Release.",
    };
  }

  const latest = await fetchGitHubJson<TauriLatestJson>(
    latestAsset.url,
    token,
    "application/octet-stream",
  );
  const latestVersion = latest.version ?? release.tag_name.replace(/^v/, "");
  const currentVersion = await getVersion();

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return {
      status: "current",
      message: "Δεν βρέθηκαν διαθέσιμες ενημερώσεις.",
    };
  }

  return {
    status: "available",
    message: `Διαθέσιμη ενημέρωση: v${latestVersion}.`,
  };
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return {
      status: "unsupported",
      message: "Ο έλεγχος ενημερώσεων τρέχει μόνο μέσα στο desktop app.",
    };
  }

  let githubToken: string | null = null;

  try {
    githubToken = await getUpdaterGitHubToken();
    if (githubToken) {
      return await checkPrivateGitHubUpdate(githubToken);
    }

    const update = await check(
      githubToken
        ? {
            headers: createUpdaterHeaders(githubToken),
          }
        : undefined,
    );

    if (!update) {
      return {
        status: "current",
        message: "Δεν βρέθηκαν διαθέσιμες ενημερώσεις.",
      };
    }

    return {
      status: "available",
      message: `Διαθέσιμη ενημέρωση: v${update.version}.`,
    };
  } catch (error) {
    const message = errorMessage(error);

    if (isMissingUpdaterConfig(message)) {
      return {
        status: "not-configured",
        message:
          "Ο updater είναι έτοιμος, αλλά χρειάζεται signing public key και endpoint πριν το release.",
      };
    }

    if (isGitHubAccessError(message) && !githubToken) {
      return {
        status: "needs-token",
        message:
          "Το GitHub repo είναι private. Αποθήκευσε updater token στις Ρυθμίσεις και δοκίμασε ξανά.",
      };
    }

    if (isGitHubAccessError(message)) {
      return {
        status: "error",
        message:
          "Το GitHub token δεν έδωσε πρόσβαση στο updater feed. Έλεγξε ότι έχει read access στο private repo.",
      };
    }

    console.error("Update check failed:", error);
    return {
      status: "error",
      message: "Ο έλεγχος ενημερώσεων απέτυχε. Δοκίμασε ξανά.",
    };
  }
}
