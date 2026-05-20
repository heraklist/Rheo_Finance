import type { PlanWithTotals } from "@/lib/types";
import { formatEuro } from "@/lib/utils";
import { Banknote, Target, TrendingDown, TrendingUp } from "lucide-react";

interface PlanKpiGridProps {
  plans: PlanWithTotals[];
  loading?: boolean;
}

export function PlanKpiGrid({ plans, loading = false }: PlanKpiGridProps) {
  const activePlans = plans.filter((plan) => plan.status === "active").length;
  const totalExpenses = plans.reduce((sum, plan) => sum + plan.total_expenses, 0);
  const totalIncome = plans.reduce((sum, plan) => sum + plan.total_income, 0);
  const totalGap = plans.reduce((sum, plan) => sum + Math.max(0, plan.funding_gap), 0);
  const items = [
    { label: "Ενεργά σχέδια", value: String(activePlans), icon: Target },
    { label: "Σύνολο εξόδων", value: formatEuro(totalExpenses), icon: TrendingDown },
    { label: "Σύνολο εσόδων", value: formatEuro(totalIncome), icon: TrendingUp },
    { label: "Κενό χρηματοδότησης", value: formatEuro(totalGap), icon: Banknote },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <section key={item.label} className="rounded-md border border-border-light bg-cream p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-label uppercase text-text-muted">{item.label}</p>
                {loading ? (
                  <div className="skel mt-3 h-7 w-24" />
                ) : (
                  <p className="mt-3 truncate text-num-lg tabular-nums text-text-primary">
                    {item.value}
                  </p>
                )}
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-light bg-sand text-gold">
                <Icon className="h-4.5 w-4.5" strokeWidth={1.7} />
              </span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
