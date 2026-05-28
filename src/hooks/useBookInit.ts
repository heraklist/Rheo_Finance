import { useEffect, useState } from "react";
import { listBooks } from "@/lib/reference";
import { useAppStore } from "@/lib/store";

/**
 * On mount, loads book list into store and resolves currentBookId
 * to a valid book (business by default). Required after the UUID migration
 * which replaces hardcoded "book-business"/"book-personal" IDs.
 */
export function useBookInit(enabled: boolean): boolean {
  const setCurrentBookId = useAppStore((s) => s.setCurrentBookId);
  const setBooks = useAppStore((s) => s.setBooks);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setReady(true);
      setBooks([]);
      setCurrentBookId("");
      return () => {
        cancelled = true;
      };
    }

    setReady(false);

    async function init() {
      try {
        const books = await listBooks();
        if (cancelled) return;

        setBooks(books);

        if (books.length === 0) return;

        const currentBookId = useAppStore.getState().currentBookId;
        const current = books.find((b) => b.id === currentBookId);
        if (current) return;

        const business = books.find((b) => b.slug === "business");
        const fallback = business ?? books[0];
        if (fallback && !cancelled) {
          setCurrentBookId(fallback.id);
        }
      } catch (err) {
        console.error("Failed to initialize books:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [enabled, setCurrentBookId, setBooks]);

  return ready;
}
