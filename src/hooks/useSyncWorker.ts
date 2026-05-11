import { generateDueRecurringTransactions } from "@/lib/recurring";
import { useAppStore } from "@/lib/store";
import { getPendingCount, syncAll } from "@/lib/sync";
import { useEffect } from "react";

const SYNC_INTERVAL_MS = 30_000;

export function useSyncWorker() {
  const { user, mfaLoading, mfaRequired, setSyncState, setLastSyncedAt, setPendingCount } =
    useAppStore();

  useEffect(() => {
    if (!user || mfaLoading || mfaRequired) {
      setPendingCount(0);
      setSyncState("synced");
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    async function refreshPendingCount() {
      const count = await getPendingCount();
      if (!cancelled) setPendingCount(count);
    }

    async function syncOnce() {
      if (cancelled) return;

      if (!navigator.onLine) {
        setSyncState("offline");
        await refreshPendingCount();
        return;
      }

      setSyncState("syncing");

      try {
        await syncAll();
        await generateDueRecurringTransactions();
        if (cancelled) return;

        setSyncState("synced");
        setLastSyncedAt(new Date().toISOString());
        await refreshPendingCount();
      } catch (err) {
        if (cancelled) return;

        console.error("Sync failed:", err);
        setSyncState("error");
        await refreshPendingCount();
      }
    }

    void syncOnce();
    intervalId = window.setInterval(syncOnce, SYNC_INTERVAL_MS);

    const handleOnline = () => void syncOnce();
    const handleOffline = () => {
      setSyncState("offline");
      void refreshPendingCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, mfaLoading, mfaRequired, setSyncState, setLastSyncedAt, setPendingCount]);
}
