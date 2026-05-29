import { useEffect } from "react";
import { LOCAL_DATA_CHANGED_EVENT } from "@/lib/db";
import { generateDueRecurringTransactions } from "@/lib/recurring";
import { listBooks } from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import { getPendingCount, syncAll } from "@/lib/sync";
import { showToast } from "@/lib/toast";

const LOCAL_CHANGE_SYNC_DEBOUNCE_MS = 750;

function isRowLevelSyncFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.startsWith("Δεν συγχρονίστηκαν ");
}

export function useSyncWorker() {
  const {
    user,
    mfaLoading,
    mfaRequired,
    setBooks,
    setCurrentBookId,
    setSyncState,
    setLastSyncedAt,
    setPendingCount,
  } = useAppStore();

  useEffect(() => {
    if (!user || mfaLoading || mfaRequired) {
      setPendingCount(0);
      setSyncState("offline");
      return;
    }

    let cancelled = false;
    let queuedAfterCurrentRun = false;
    let syncInProgress = false;
    let debounceTimer: number | null = null;

    async function refreshPendingCount(): Promise<number> {
      const count = await getPendingCount();
      if (!cancelled) setPendingCount(count);
      return count;
    }

    async function refreshBooks() {
      const books = await listBooks();
      if (cancelled) return;

      setBooks(books);

      const fallbackBook = books.find((book) => book.slug === "business") ?? books[0];
      if (!fallbackBook) {
        setCurrentBookId("");
        return;
      }

      const currentBookId = useAppStore.getState().currentBookId;
      if (books.some((book) => book.id === currentBookId)) return;

      setCurrentBookId(fallbackBook.id);
    }

    async function markSyncSuccess() {
      await generateDueRecurringTransactions();
      await refreshBooks();
      if (cancelled) return;

      setSyncState("synced");
      setLastSyncedAt(new Date().toISOString());
      await refreshPendingCount();
    }

    async function syncOnce() {
      if (cancelled) return;

      if (syncInProgress) {
        queuedAfterCurrentRun = true;
        return;
      }

      if (!navigator.onLine) {
        setSyncState("offline");
        await refreshPendingCount();
        return;
      }

      syncInProgress = true;
      queuedAfterCurrentRun = false;
      setSyncState("syncing");

      try {
        await syncAll();
        await markSyncSuccess();
      } catch (err) {
        if (cancelled) return;

        console.error("Sync failed:", err);

        if (isRowLevelSyncFailure(err)) {
          await markSyncSuccess();
          const pendingCount = await refreshPendingCount();
          if (pendingCount > 0) {
            showToast(
              `Ο συγχρονισμός ολοκληρώθηκε με ${pendingCount} εκκρεμότητες για επανάληψη.`,
              "warning",
            );
          }
          return;
        }

        setSyncState("error");
        showToast("Αποτυχία συγχρονισμού. Θα δοκιμαστεί ξανά μετά την επόμενη αλλαγή.", "error");
        await refreshPendingCount();
      } finally {
        syncInProgress = false;
        if (!cancelled && queuedAfterCurrentRun) {
          queuedAfterCurrentRun = false;
          void syncOnce();
        }
      }
    }

    function scheduleSync() {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }

      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void syncOnce();
      }, LOCAL_CHANGE_SYNC_DEBOUNCE_MS);
    }

    // Initial login/session sync. After this succeeds, sync is event-driven.
    void syncOnce();

    const handleOnline = () => void syncOnce();
    const handleOffline = () => {
      setSyncState("offline");
      void refreshPendingCount();
    };
    const handleLocalDataChanged = () => scheduleSync();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(LOCAL_DATA_CHANGED_EVENT, handleLocalDataChanged);

    return () => {
      cancelled = true;
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(LOCAL_DATA_CHANGED_EVENT, handleLocalDataChanged);
    };
  }, [
    user,
    mfaLoading,
    mfaRequired,
    setBooks,
    setCurrentBookId,
    setSyncState,
    setLastSyncedAt,
    setPendingCount,
  ]);
}
