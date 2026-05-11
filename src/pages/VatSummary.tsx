import { type VatQuarter, getVatByQuarter } from "@/lib/analytics";
import { useAppStore } from "@/lib/store";
import { cn, formatEuro } from "@/lib/utils";
import { AlertCircle, ArrowLeft, ArrowRight, Calculator, ListFilter } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function quarterAmountClass(amount: number): string {
  if (amount > 0) return "text-expense";
  if (amount < 0) return "text-income";
  return "text-text-primary";
}

function quarterCaption(quarter: VatQuarter): string {
  if (quarter.net > 0) return "Πληρωτέο";
  if (quarter.net < 0) return "Πιστωτικό";
  return "Μηδενικό";
}

export function VatSummary() {
  const currentBookId = useAppStore((state) => state.currentBookId);
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarters, setQuarters] = useState<VatQuarter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const rows = await getVatByQuarter(year, currentBookId);
        if (!cancelled) setQuarters(rows);
      } catch (err) {
        console.error("Failed to load VAT summary:", err);
        if (!cancelled) setError("Δεν φορτώθηκε η σύνοψη ΦΠΑ.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [currentBookId, year]);

  const total = useMemo(
    () =>
      quarters.reduce(
        (acc, quarter) => ({
          output: acc.output + quarter.output,
          input: acc.input + quarter.input,
          net: acc.net + quarter.net,
          transactionCount: acc.transactionCount + quarter.transactionCount,
        }),
        { output: 0, input: 0, net: 0, transactionCount: 0 },
      ),
    [quarters],
  );

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light">
        <div>
          <h1 className="text-h2">Σύνοψη ΦΠΑ</h1>
          <p className="text-caption mt-0.5">Τριμηνιαία εικόνα για λογιστή</p>
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

      <section className="relative overflow-hidden rounded-md border border-border-light bg-cream p-4 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label uppercase text-text-muted mb-2">Ετήσιο καθαρό ΦΠΑ</p>
            {loading ? (
              <div className="skel h-8 w-32" />
            ) : (
              <p className={cn("text-num-xl tabular-nums", quarterAmountClass(total.net))}>
                {formatEuro(total.net)}
              </p>
            )}
            <p className="text-caption mt-2">
              Έξοδος ΦΠΑ {formatEuro(total.output)} · Είσοδος ΦΠΑ {formatEuro(total.input)}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-light bg-sand text-gold">
            <Calculator className="h-5 w-5" strokeWidth={1.7} />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />
      </section>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skel h-44" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {quarters.map((quarter) => (
            <section
              key={quarter.quarter}
              className="rounded-md border border-border-light bg-cream p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-h3">{quarter.label}</h2>
                  <p className="text-caption text-text-muted">
                    {quarter.transactionCount} συναλλαγές
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full border border-border-light bg-sand px-2 py-1 text-[11px] font-semibold",
                    quarterAmountClass(quarter.net),
                  )}
                >
                  {quarterCaption(quarter)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-text-muted">Output ΦΠΑ</span>
                  <span className="font-medium tabular-nums text-expense">
                    {formatEuro(quarter.output)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-text-muted">Input ΦΠΑ</span>
                  <span className="font-medium tabular-nums text-income">
                    {formatEuro(quarter.input)}
                  </span>
                </div>
                <div className="flex justify-between gap-3 border-t border-border-light pt-2">
                  <span className="font-medium text-text-primary">Καθαρό</span>
                  <span
                    className={cn("font-semibold tabular-nums", quarterAmountClass(quarter.net))}
                  >
                    {formatEuro(quarter.net)}
                  </span>
                </div>
              </div>

              <Link
                to={`/transactions?fromDate=${quarter.fromDate}&toDate=${quarter.toDate}`}
                className="mt-4 inline-flex items-center gap-2 text-gold text-sm font-medium hover:underline"
              >
                <ListFilter className="h-4 w-4" strokeWidth={1.7} />
                Συναλλαγές τριμήνου
              </Link>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
