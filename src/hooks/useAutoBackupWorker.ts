import { useEffect } from "react";

import { createJsonBackup, getLastAutoBackupAt, markAutoBackupCompleted } from "@/lib/backup";
import { useAppStore } from "@/lib/store";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function useAutoBackupWorker() {
  const user = useAppStore((state) => state.user);
  const autoBackupEnabled = useAppStore((state) => state.autoBackupEnabled);
  const backupDirectory = useAppStore((state) => state.backupDirectory);

  useEffect(() => {
    if (!user || !autoBackupEnabled) return;

    let cancelled = false;

    async function checkAndBackup() {
      if (cancelled) return;

      try {
        const lastBackup = await getLastAutoBackupAt();
        const lastBackupMs = lastBackup ? Date.parse(lastBackup) : 0;

        if (Date.now() - lastBackupMs >= ONE_WEEK_MS) {
          await createJsonBackup({ auto: true, directoryPath: backupDirectory });
          await markAutoBackupCompleted();
        }
      } catch (err) {
        console.error("[auto-backup] Failed:", err);
      }
    }

    void checkAndBackup();
    const intervalId = window.setInterval(checkAndBackup, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [user, autoBackupEnabled, backupDirectory]);
}
