import { lazy, Suspense } from "react";
import type { MonthlyDataPoint } from "@/components/charts/IncomeExpenseChart";

const LazyIncomeExpenseChart = lazy(async () => {
  const module = await import("@/components/charts/IncomeExpenseChart");
  return { default: module.IncomeExpenseChart };
});

interface DashboardChartSectionProps {
  data: MonthlyDataPoint[];
  empty: boolean;
  loading: boolean;
}

export function DashboardChartSection({ data, empty, loading }: DashboardChartSectionProps) {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-h3">Έσοδα / Έξοδα</h2>
        <div className="flex gap-3 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-income rounded-sm" /> έσοδα
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-expense rounded-sm" /> έξοδα
          </span>
        </div>
      </div>
      {loading ? (
        <div className="skel h-[120px]" />
      ) : empty ? (
        <div className="bg-cream border border-border-light rounded-md h-[120px] flex items-center justify-center">
          <p className="text-caption">Καμία δραστηριότητα για αυτή την περίοδο</p>
        </div>
      ) : (
        <Suspense fallback={<div className="skel h-[120px]" />}>
          <LazyIncomeExpenseChart data={data} />
        </Suspense>
      )}
    </section>
  );
}
