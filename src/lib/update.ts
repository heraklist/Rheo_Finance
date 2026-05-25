import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { platform } from "@tauri-apps/plugin-os";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { type DownloadEvent, check } from "@tauri-apps/plugin-updater";

export type UpdateCheckStatus =
  | "current"
  | "available"
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
}

export interface InstallProgress {
  downloaded: number;
  total: number;
  event: DownloadEvent["event"];
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

const RELEASES_PAGE_URL = "https://github.com/heraklist/Rheo_Finance/releases/latest";
const DESKTOP_MANIFEST_URL =
  "https://github.com/heraklist/Rheo_Finance/releases/latest/download/latest-desktop.json";
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

async function fetchPublicJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Updater feed request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function checkDesktopWithTauri(currentVersion: string): Promise<UpdateInfo> {
  const update = await check();

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

async function checkDesktopPublicManifest(currentVersion: string): Promise<UpdateInfo> {
  const manifest = await fetchPublicJson<DesktopManifest>(DESKTOP_MANIFEST_URL);
  const latestVersion = manifest.version ?? currentVersion;

  return {
    available: compareVersions(latestVersion, currentVersion) > 0,
    currentVersion,
    installMode: "manual",
    latestVersion,
    releaseNotes: manifest.notes ?? "",
    releaseUrl: RELEASES_PAGE_URL,
    isDesktop: true,
  };
}

async function checkDesktop(currentVersion: string): Promise<UpdateInfo> {
  try {
    return await checkDesktopWithTauri(currentVersion);
  } catch (error) {
    if (isMissingUpdaterConfig(errorMessage(error))) throw error;
    return checkDesktopPublicManifest(currentVersion);
  }
}

async function checkAndroid(currentVersion: string): Promise<UpdateInfo> {
  const manifest = await fetchPublicJson<AndroidManifest>(ANDROID_MANIFEST_URL);
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

export async function checkForUpdateInfo(): Promise<UpdateInfo> {
  if (!isTauri()) {
    return {
      available: false,
      currentVersion: "browser",
      isDesktop: true,
    };
  }

  const currentVersion = await getVersion();

  if ((await platform()) === "android") {
    return checkAndroid(currentVersion);
  }

  return checkDesktop(currentVersion);
}

export async function installUpdate(
  info: UpdateInfo,
  onProgress?: (progress: InstallProgress) => void,
): Promise<void> {
  if (!info.available) return;

  if (!info.isDesktop || info.installMode === "manual") {
    await openExternalUrl(info.releaseUrl ?? RELEASES_PAGE_URL);
    return;
  }

  const update = await check();
  if (!update) throw new Error("Update no longer available");

  let downloaded = 0;
  let total = 0;
  await update.downloadAndInstall((progress) => {
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
  });

  await invoke("restart_app");
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return {
      status: "unsupported",
      message: "Ο έλεγχος ενημερώσεων τρέχει μόνο μέσα στην εφαρμογή.",
    };
  }

  try {
    const info = await checkForUpdateInfo();

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
          "Ο updater χρειάζεται έγκυρο signing public key και release endpoint πριν το επόμενο release.",
      };
    }

    console.error("Update check failed:", error);
    return {
      status: "error",
      message: "Ο έλεγχος ενημερώσεων απέτυχε. Δοκίμασε ξανά.",
    };
  }
}
