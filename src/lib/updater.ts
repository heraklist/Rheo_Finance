import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";

export type UpdateCheckStatus =
  | "current"
  | "available"
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

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!isTauri()) {
    return {
      status: "unsupported",
      message: "Ο έλεγχος ενημερώσεων τρέχει μόνο μέσα στο desktop app.",
    };
  }

  try {
    const update = await check();

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

    console.error("Update check failed:", error);
    return {
      status: "error",
      message: "Ο έλεγχος ενημερώσεων απέτυχε. Δοκίμασε ξανά.",
    };
  }
}
