import { type ForecastResult, getForecast } from "@/lib/analytics";
import { useAppStore } from "@/lib/store";
import { cn, formatEuro } from "@/lib/utils";
import { AlertCircle, ArrowLeft, ArrowRight, Info, TrendingUp } from "lucide-react";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";

const LazyForecastLineChart = lazy(async () => {
  const module = await import("@/components/charts/ForecastLineChart");
  return { default: module.ForecastLineChart };
});

function startDateForYear(year: number): string {
  const now = new Date();
  const month = year === now.getFullYear() ? now.getMonth() + 1 : 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function amountClass(amount: number): string {
  if (amount > 0) return "text-income";
  if (amount < 0) return "text-expense";
  return "text-text-primary";
}

export function Forecast() {
  const currentBookId = useAppStore((state) => state.currentBookId);
  const [year, setYear] = useState(new Date().getFullYear());
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const result = await getForecast({
          bookId: currentBookId,
          monthsAhead: 12,
          basePeriodMonths: 3,
          startDate: startDateForYear(year),
        });
        if (!cancelled) setForecast(result);
      } catch (err) {
        console.error("Failed to load forecast:", err);
        if (!cancelled) setError("Δεν φορτώθηκε το forecast.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentBookId, year]);

  const totals = useMemo(() => {
    const months = forecast?.months ?? [];
    return months.reduce(
      (acc, month) => ({
        income: acc.income + month.income,
        expense: acc.expense + month.expense,
        net: acc.net + month.net,
        endingBalance: month.cumulative,
      }),
      { income: 0, expense: 0, net: 0, endingBalance: forecast?.openingBalance ?? 0 },
    );
  }, [forecast]);

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light">
        <div>
          <h1 className="text-h2">Πρόβλεψη</h1>
          <p className="text-caption mt-0.5">Προβολή cashflow 12 μηνών</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setYear((current) => current - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-text-secondary hover:bg-sand"
            aria-label="Προηγούμενο έτος"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
          </button>
          <div className="min-w-16 text-center text-sm font-semibold tabular-nums">{year}</div>
          <button
            type="button"
            onClick={() => setYear((current) => current + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-text-secondary hover:bg-sand"
            aria-label="Επόμενο έτος"
          >
            <ArrowRight className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-cream border border-expense-light rounded-md p-4 mb-4 text-expense flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <section className="rounded-md border border-border-light bg-cream p-4 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-label uppercase text-text-muted mb-2">Τελική εκτίμηση</p>
            {loading ? (
              <div className="skel h-8 w-36" />
            ) : (
              <p className={cn("text-num-xl tabular-nums", amountClass(totals.endingBalance))}>
                {formatEuro(totals.endingBalance)}
              </p>
            )}
            <p className="text-caption mt-2">
              Αφετηρία {formatEuro(forecast?.openingBalance ?? 0)} · Καθαρό {formatEuro(totals.net)}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-light bg-sand text-gold">
            <TrendingUp className="h-5 w-5" strokeWidth={1.7} />
          </div>
        </div>
        {loading ? (
          <div className="skel h-44" />
        ) : forecast ? (
          <Suspense fallback={<div className="skel h-44" />}>
            <LazyForecastLineChart data={forecast.months} />
          </Suspense>
        ) : null}
      </section>

      {forecast ? (
        <section className="rounded-md border border-border-light bg-cream p-4 mb-5">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-gold mt-0.5" strokeWidth={1.7} />
            <p className="text-caption text-text-muted">
              Βασίζεται σε {forecast.recurringCount} ενεργά πάγια και μέσο όρο{" "}
              {forecast.basePeriodMonths} μηνών για μη πάγιες εγγραφές. Ιστορικά δεδομένα βρέθηκαν
              σε {forecast.historyMonthsWithData} μήνες, άρα το πραγματικό αποτέλεσμα μπορεί να
              αποκλίνει.
            </p>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="skel h-14" />
          ))}
        </div>
      ) : forecast ? (
        <section className="overflow-hidden rounded-md border border-border-light bg-cream">
          <div className="grid grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr_1fr] gap-2 border-b border-border-light bg-sand px-3 py-2 text-[11px] font-semibold uppercase text-text-muted">
            <span>Μήνας</span>
            <span className="text-right">Έσοδα</span>
            <span className="text-right">Έξοδα</span>
            <span className="text-right">Καθαρό</span>
            <span className="text-right">Σωρευτικό</span>
          </div>
          {forecast.months.map((month) => (
            <div
              key={month.month}
              className="grid grid-cols-[1.15fr_0.9fr_0.9fr_0.9fr_1fr] gap-2 border-b border-border-light px-3 py-3 text-xs last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text-primary">{month.label}</p>
                <p className="text-[10px] text-text-muted">
                  Πάγια{" "}
                  {formatEuro(month.recurringIncome - month.recurringExpense, {
                    compact: true,
                  })}
                </p>
              </div>
              <span className="text-right tabular-nums text-income">
                {formatEuro(month.income, { compact: true })}
              </span>
              <span className="text-right tabular-nums text-expense">
                {formatEuro(month.expense, { compact: true })}
              </span>
              <span className={cn("text-right tabular-nums font-medium", amountClass(month.net))}>
                {formatEuro(month.net, { compact: true })}
              </span>
              <span
                className={cn(
                  "text-right tabular-nums font-semibold",
                  amountClass(month.cumulative),
                )}
              >
                {formatEuro(month.cumulative, { compact: true })}
              </span>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
