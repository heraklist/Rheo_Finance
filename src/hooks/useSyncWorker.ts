import { useEffect } from "react";
import { generateDueRecurringTransactions } from "@/lib/recurring";
import { listBooks } from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import { getPendingCount, syncAll } from "@/lib/sync";
import { showToast } from "@/lib/toast";

const SYNC_INTERVAL_MS = 30_000;

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
    let intervalId: number | null = null;
    let syncInProgress = false;

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
      if (cancelled || syncInProgress) return;

      if (!navigator.onLine) {
        setSyncState("offline");
        await refreshPendingCount();
        return;
      }

      syncInProgress = true;
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
        showToast("Αποτυχία συγχρονισμού. Θα δοκιμαστεί ξανά σύντομα.", "error");
        await refreshPendingCount();
      } finally {
        syncInProgress = false;
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
