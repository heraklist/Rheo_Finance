import { runRecurringDailyCheck } from "@/lib/recurring";
import { useAppStore } from "@/lib/store";
import { getPendingCount } from "@/lib/sync";
import { useEffect } from "react";

export function useRecurringWorker() {
  const { authLoading, setPendingCount, user } = useAppStore();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (authLoading || !user) return;

      try {
        const result = await runRecurringDailyCheck();
        if (cancelled) return;

        if (result.generated > 0 || result.skipped > 0) {
          setPendingCount(await getPendingCount());
        }
      } catch (err) {
        console.error("Recurring generation failed:", err);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [authLoading, setPendingCount, user]);
}
