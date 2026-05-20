import { calculateBudgetPressure, monthsUntilTarget } from "@/lib/plans";
import type { PlanStatus, PlanType, PlanWithTotals } from "@/lib/types";
import { cn, formatDateShort, formatEuro } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const TYPE_LABELS: Record<PlanType, string> = {
  purchase: "Αγορά",
  project: "Project",
  travel: "Ταξίδι",
  emergency: "Αποθεματικό",
  debt: "Αποπληρωμή",
  custom: "Σχέδιο",
};

const STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Πρόχειρο",
  active: "Ενεργό",
  completed: "Ολοκληρωμένο",
  paused: "Σε παύση",
};

function pressureTone(pressure: number): "income" | "warning" | "expense" {
  if (pressure > 75) return "expense";
  if (pressure > 50) return "warning";
  return "income";
}

function pressureClass(pressure: number): string {
  const tone = pressureTone(pressure);
  if (tone === "expense") return "bg-expense";
  if (tone === "warning") return "bg-warning";
  return "bg-income";
}

export function PlanCard({ plan }: { plan: PlanWithTotals }) {
  const pressure = calculateBudgetPressure(Math.max(0, plan.funding_gap), plan.target_date, 500);
  const months = monthsUntilTarget(plan.target_date);
  const requiredMonthly = Math.max(0, plan.funding_gap) / months;

  return (
    <Link
      to={`/plans/${plan.id}`}
      className="block rounded-md border border-border-light bg-cream p-4 transition-colors hover:bg-sand/70"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-sm border border-border-light bg-sand px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
              {TYPE_LABELS[plan.type]}
            </span>
            <span
              className={cn(
                "rounded-sm px-2 py-0.5 text-[10px] font-semibold",
                plan.status === "active"
                  ? "bg-income/10 text-income"
                  : plan.status === "completed"
                    ? "bg-gold/10 text-gold"
                    : "bg-sand text-text-secondary",
              )}
            >
              {STATUS_LABELS[plan.status]}
            </span>
          </div>
          <h2 className="truncate text-h3 text-text-primary">{plan.name}</h2>
          <p className="mt-1 text-caption text-text-muted">
            {plan.target_date ? formatDateShort(plan.target_date) : "Χωρίς ημερομηνία"}
            {plan.include_in_forecast ? " · μέσα στην πρόβλεψη" : ""}
          </p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.7} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-[10px] text-text-muted">Έξοδα</p>
          <p className="mt-1 truncate font-semibold tabular-nums text-expense">
            {formatEuro(plan.total_expenses, { compact: true })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Πηγές</p>
          <p className="mt-1 truncate font-semibold tabular-nums text-income">
            {formatEuro(plan.total_income, { compact: true })}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-text-muted">Κενό</p>
          <p className="mt-1 truncate font-semibold tabular-nums text-text-primary">
            {formatEuro(Math.max(0, plan.funding_gap), { compact: true })}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-text-muted">
          <span>{formatEuro(requiredMonthly, { compact: true })}/μήνα</span>
          <span>{pressure}% πίεση</span>
        </div>
        <div className="h-1.5 rounded-full bg-sand">
          <div
            className={cn("h-1.5 rounded-full", pressureClass(pressure))}
            style={{ width: `${Math.min(100, Math.max(0, pressure))}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
