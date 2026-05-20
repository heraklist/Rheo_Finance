import { getUpdaterGitHubToken } from "@/lib/updaterToken";
import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { type DownloadEvent, check } from "@tauri-apps/plugin-updater";

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
  info?: UpdateInfo;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  installMode?: "manual" | "tauri";
  latestVersion?: string;
  releaseUrl?: string;
  releaseNotes?: string;
  isDesktop: boolean;
  needsToken?: boolean;
}

export interface InstallProgress {
  downloaded: number;
  total: number;
  event: DownloadEvent["event"];
}

interface GitHubReleaseAsset {
  browser_download_url: string;
  name: string;
  url: string;
}

interface GitHubLatestRelease {
  assets: GitHubReleaseAsset[];
  body?: string;
  html_url: string;
  tag_name: string;
}

interface DesktopManifestPlatform {
  signature?: string;
  url?: string;
}

interface DesktopManifest {
  notes?: string;
  platforms?: Record<string, DesktopManifestPlatform>;
  pub_date?: string;
  version?: string;
}

interface AndroidManifest {
  notes?: string;
  pub_date?: string;
  url?: string;
  version?: string;
}

const GITHUB_API_BASE = "https://api.github.com/repos/heraklist/Rheo_Finance";
const RELEASES_PAGE_URL = "https://github.com/heraklist/Rheo_Finance/releases/latest";
const ANDROID_MANIFEST_URL =
  "https://github.com/heraklist/Rheo_Finance/releases/latest/download/latest-android.json";

async function openExternalUrl(url: string): Promise<void> {
  try {
    await openExternal(url);
  } catch (error) {
    console.error("Failed to open external update URL:", error);
    throw error;
  }
}

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

export function compareVersions(a: string, b: string): number {
  const left = a
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const right = b
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
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

async function fetchRelease(token: string): Promise<GitHubLatestRelease> {
  return fetchGitHubJson<GitHubLatestRelease>(
    `${GITHUB_API_BASE}/releases/latest`,
    token,
    "application/vnd.github+json",
  );
}

async function fetchReleaseAssetJson<T>(
  release: GitHubLatestRelease,
  token: string,
  assetNames: string[],
): Promise<T | null> {
  const asset = release.assets.find((candidate) => assetNames.includes(candidate.name));
  if (!asset) return null;

  return fetchGitHubJson<T>(asset.url, token, "application/octet-stream");
}

async function checkDesktopWithTauri(
  currentVersion: string,
  token: string | null,
): Promise<UpdateInfo> {
  const headers = token ? createUpdaterHeaders(token) : undefined;
  const update = await check(headers ? { headers } : undefined);

  if (!update) {
    return { available: false, currentVersion, installMode: "tauri", isDesktop: true };
  }

  return {
    available: true,
    currentVersion,
    installMode: "tauri",
    latestVersion: update.version,
    releaseNotes: update.body ?? "",
    releaseUrl: RELEASES_PAGE_URL,
    isDesktop: true,
  };
}

async function checkDesktopFromGitHubApi(
  currentVersion: string,
  token: string,
): Promise<UpdateInfo> {
  const release = await fetchRelease(token);
  const manifest = await fetchReleaseAssetJson<DesktopManifest>(release, token, [
    "latest-desktop.json",
    "latest.json",
  ]);
  const latestVersion = manifest?.version ?? release.tag_name.replace(/^v/, "");

  return {
    available: compareVersions(latestVersion, currentVersion) > 0,
    currentVersion,
    installMode: "manual",
    latestVersion,
    releaseNotes: manifest?.notes ?? release.body ?? "",
    releaseUrl: release.html_url,
    isDesktop: true,
  };
}

async function checkDesktop(currentVersion: string, token: string | null): Promise<UpdateInfo> {
  if (token) return checkDesktopFromGitHubApi(currentVersion, token);

  try {
    return await checkDesktopWithTauri(currentVersion, null);
  } catch (error) {
    if (isGitHubAccessError(errorMessage(error))) {
      return {
        available: false,
        currentVersion,
        isDesktop: true,
        needsToken: true,
      };
    }
    throw error;
  }
}

async function checkAndroidFromGitHubApi(
  currentVersion: string,
  token: string,
): Promise<UpdateInfo> {
  const release = await fetchRelease(token);
  const manifest = await fetchReleaseAssetJson<AndroidManifest>(release, token, [
    "latest-android.json",
  ]);
  const latestVersion = manifest?.version ?? release.tag_name.replace(/^v/, "");
  const releaseUrl = manifest?.url ?? release.html_url;

  return {
    available: compareVersions(latestVersion, currentVersion) > 0,
    currentVersion,
    latestVersion,
    releaseNotes: manifest?.notes ?? "",
    releaseUrl,
    isDesktop: false,
  };
}

async function checkAndroidPublic(currentVersion: string): Promise<UpdateInfo> {
  const response = await fetch(ANDROID_MANIFEST_URL);

  if (!response.ok) {
    return {
      available: false,
      currentVersion,
      isDesktop: false,
      needsToken: response.status === 401 || response.status === 403 || response.status === 404,
    };
  }

  const manifest = (await response.json()) as AndroidManifest;
  const latestVersion = manifest.version ?? currentVersion;

  return {
    available: compareVersions(latestVersion, currentVersion) > 0,
    currentVersion,
    latestVersion,
    releaseNotes: manifest.notes ?? "",
    releaseUrl: manifest.url ?? RELEASES_PAGE_URL,
    isDesktop: false,
  };
}

async function checkAndroid(currentVersion: string, token: string | null): Promise<UpdateInfo> {
  if (token) return checkAndroidFromGitHubApi(currentVersion, token);
  return checkAndroidPublic(currentVersion);
}

export async function checkForUpdateInfo(): Promise<UpdateInfo> {
  if (!isTauri()) {
    return {
      available: false,
      currentVersion: "browser",
      isDesktop: true,
    };
  }

  const currentVersion = await getVersion();
  const token = await getUpdaterGitHubToken();

  if ((await platform()) === "android") {
    return checkAndroid(currentVersion, token);
  }

  return checkDesktop(currentVersion, token);
}

export async function installUpdate(
  info: UpdateInfo,
  onProgress?: (progress: InstallProgress) => void,
): Promise<void> {
  if (!info.available) return;

  if (!info.isDesktop) {
    await openExternalUrl(info.releaseUrl ?? RELEASES_PAGE_URL);
    return;
  }

  if (info.installMode === "manual") {
    await openExternalUrl(info.releaseUrl ?? RELEASES_PAGE_URL);
    return;
  }

  const token = await getUpdaterGitHubToken();
  const headers = token ? createUpdaterHeaders(token) : undefined;
  const update = await check(headers ? { headers } : undefined);
  if (!update) throw new Error("Update no longer available");

  let downloaded = 0;
  let total = 0;
  await update.downloadAndInstall(
    (progress) => {
      switch (progress.event) {
        case "Started":
          total = progress.data.contentLength ?? 0;
          downloaded = 0;
          break;
        case "Progress":
          downloaded += progress.data.chunkLength;
          break;
        case "Finished":
          downloaded = total;
          break;
      }
      onProgress?.({ downloaded, total, event: progress.event });
    },
    headers ? { headers } : undefined,
  );

  await invoke("restart_app");
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return {
      status: "unsupported",
      message: "Ο έλεγχος ενημερώσεων τρέχει μόνο μέσα στην εφαρμογή.",
    };
  }

  let token: string | null = null;

  try {
    token = await getUpdaterGitHubToken();
    const info = await checkForUpdateInfo();

    if (info.needsToken && !token) {
      return {
        status: "needs-token",
        message:
          "Το GitHub repo είναι private. Αποθήκευσε updater token στις Ρυθμίσεις και δοκίμασε ξανά.",
        info,
      };
    }

    if (!info.available) {
      return {
        status: "current",
        message: "Δεν βρέθηκαν διαθέσιμες ενημερώσεις.",
        info,
      };
    }

    return {
      status: "available",
      message: `Διαθέσιμη ενημέρωση: v${info.latestVersion}.`,
      info,
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

    if (isGitHubAccessError(message) && !token) {
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
