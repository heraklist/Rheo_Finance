import type { CoverageSummary } from "@/lib/types";
import { cn, formatEuro } from "@/lib/utils";

function barToneClass(value: number): string {
  if (value >= 100) return "bg-income";
  if (value >= 70) return "bg-warning";
  return "bg-expense";
}

interface CoverageSummaryCardProps {
  summary: CoverageSummary;
  loading?: boolean;
}

export function CoverageSummaryCard({ summary, loading = false }: CoverageSummaryCardProps) {
  const balanceClass = summary.balance >= 0 ? "text-income" : "text-expense";
  const kpis = [
    {
      label: "Σύνολο εξόδων",
      value: formatEuro(summary.total_expenses),
      sub: `Πληρωμένα ${formatEuro(summary.paid_expenses, { compact: true })}`,
      className: "text-expense",
    },
    {
      label: "Αναμενόμενα",
      value: formatEuro(summary.total_income),
      sub: `Εισπραχθέντα ${formatEuro(summary.received_income, { compact: true })}`,
      className: "text-income",
    },
    {
      label: summary.balance >= 0 ? "Πλεόνασμα" : "Υπόλοιπο",
      value: formatEuro(summary.balance),
      sub: `Κάλυψη ${summary.coverage_pct}%`,
      className: balanceClass,
    },
  ];

  return (
    <section className="mb-5 rounded-md border border-border-light bg-cream p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label}>
            <p className="text-label uppercase text-text-muted">{kpi.label}</p>
            {loading ? (
              <div className="skel mt-2 h-7 w-28" />
            ) : (
              <p className={cn("mt-2 truncate text-num-lg tabular-nums", kpi.className)}>
                {kpi.value}
              </p>
            )}
            <p className="mt-1 text-caption text-text-muted">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-caption text-text-muted">
            <span>Κάλυψη</span>
            <span>{summary.coverage_pct}%</span>
          </div>
          <progress
            aria-label="Κάλυψη"
            className={cn("progress-meter h-2", barToneClass(summary.coverage_pct))}
            max={100}
            value={Math.min(100, summary.coverage_pct)}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-caption text-text-muted">
            <span>Πρόοδος πληρωμών</span>
            <span>{summary.payment_progress_pct}%</span>
          </div>
          <progress
            aria-label="Πρόοδος πληρωμών"
            className="progress-meter h-2 bg-gold"
            max={100}
            value={Math.min(100, summary.payment_progress_pct)}
          />
        </div>
      </div>
    </section>
  );
}
