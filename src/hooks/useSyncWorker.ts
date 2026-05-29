import { useEffect } from "react";
import { LOCAL_DATA_CHANGED_EVENT } from "@/lib/db";
import { generateDueRecurringTransactions } from "@/lib/recurring";
import { listBooks } from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import { getPendingCount, syncAll } from "@/lib/sync";
import { showToast } from "@/lib/toast";

const LOCAL_CHANGE_SYNC_DEBOUNCE_MS = 750;

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

    async function refreshPendingCount() {
      const count = await getPendingCount();
      if (!cancelled) setPendingCount(count);
    }

    async function refreshBooks() {
      const books = await listBooks();
      if (cancelled) return;

      setBooks(books);

      if (books.length === 0) {
        setCurrentBookId("");
        return;
      }

      const currentBookId = useAppStore.getState().currentBookId;
      if (books.some((book) => book.id === currentBookId)) return;

      const business = books.find((book) => book.slug === "business");
      setCurrentBookId((business ?? books[0]).id);
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
        await generateDueRecurringTransactions();
        await refreshBooks();
        if (cancelled) return;

        setSyncState("synced");
        setLastSyncedAt(new Date().toISOString());
        await refreshPendingCount();
      } catch (err) {
        if (cancelled) return;

        console.error("Sync failed:", err);
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
