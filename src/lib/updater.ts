import { getUpdaterGitHubToken } from "@/lib/updaterToken";
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
