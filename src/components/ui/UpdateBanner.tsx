import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  checkForUpdateInfo,
  type InstallProgress,
  installUpdate,
  type UpdateInfo,
} from "@/lib/update";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DISMISS_KEY_PREFIX = "update-dismissed:";

function formatProgress(progress: InstallProgress | null): string {
  if (!progress) return "Λήψη...";
  if (!progress.total) return "Λήψη...";

  const pct = Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
  return `Λήψη ${pct}%`;
}

function formatInstallLabel(
  info: UpdateInfo,
  installing: boolean,
  progress: InstallProgress | null,
): string {
  if (installing) {
    if (info.installMode === "manual") return "Άνοιγμα...";
    return formatProgress(progress);
  }

  if (info.installMode === "manual") return "Άνοιγμα";
  return info.isDesktop ? "Αναβάθμιση" : "Κατέβασε";
}

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (cancelled) return;

      try {
        const result = await checkForUpdateInfo();
        if (cancelled) return;

        if (result.available && result.latestVersion) {
          const dismissed = localStorage.getItem(DISMISS_KEY_PREFIX + result.latestVersion);
          if (!dismissed) setInfo(result);
        }
      } catch (err) {
        console.error("[UpdateBanner] check failed:", err);
      }
    }

    void check();
    const intervalId = window.setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  if (!info?.available) return null;

  async function handleInstall() {
    if (!info) return;

    setInstalling(true);
    setProgress(null);
    setError(null);

    try {
      await installUpdate(info, setProgress);
      if (!info.isDesktop || info.installMode === "manual") {
        setInfo(null);
        setInstalling(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Άγνωστο σφάλμα.";
      setError(message);
      setInstalling(false);
    }
  }

  function handleDismiss() {
    if (info?.latestVersion) {
      localStorage.setItem(DISMISS_KEY_PREFIX + info.latestVersion, "1");
    }
    setInfo(null);
  }

  return (
    <div className="border-b-2 border-gold bg-charcoal text-text-on-dark">
      <div className="flex items-center gap-3 px-4 py-3">
        <Download className="h-4 w-4 flex-shrink-0 text-gold" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Νέα έκδοση {info.latestVersion} διαθέσιμη</div>
          {info.releaseNotes ? (
            <div className="truncate text-xs text-gold-soft">
              {info.releaseNotes.split("\n")[0]}
            </div>
          ) : null}
          {error ? <div className="mt-1 text-xs text-expense-light">{error}</div> : null}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-charcoal transition-colors hover:bg-gold-soft disabled:opacity-50"
          >
            {formatInstallLabel(info, installing, progress)}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={installing}
            className="p-1 text-text-on-dark/70 hover:text-text-on-dark disabled:opacity-50"
            aria-label="Αναβολή ενημέρωσης"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
