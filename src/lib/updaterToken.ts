import { secureAuthStorage } from "@/lib/secureAuthStorage";
import { isTauri } from "@tauri-apps/api/core";

const UPDATER_GITHUB_TOKEN_KEY = "updater:github-token";

export async function getUpdaterGitHubToken(): Promise<string | null> {
  if (!isTauri()) return null;

  const token = await secureAuthStorage.getItem(UPDATER_GITHUB_TOKEN_KEY);
  const trimmed = token?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export async function setUpdaterGitHubToken(token: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("Updater token storage is only available in the desktop app.");
  }

  const trimmed = token.trim();
  if (!trimmed) {
    await clearUpdaterGitHubToken();
    return;
  }

  await secureAuthStorage.setItem(UPDATER_GITHUB_TOKEN_KEY, trimmed);
}

export async function clearUpdaterGitHubToken(): Promise<void> {
  if (!isTauri()) return;

  await secureAuthStorage.removeItem(UPDATER_GITHUB_TOKEN_KEY);
}

export async function hasUpdaterGitHubToken(): Promise<boolean> {
  return (await getUpdaterGitHubToken()) !== null;
}
