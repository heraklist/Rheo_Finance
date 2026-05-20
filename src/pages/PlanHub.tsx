import { PlanCard } from "@/components/plans/PlanCard";
import { PlanKpiGrid } from "@/components/plans/PlanKpiGrid";
import { PlanTemplates } from "@/components/plans/PlanTemplates";
import { createPlan, listPlans } from "@/lib/plans";
import { useAppStore } from "@/lib/store";
import { getPendingCount } from "@/lib/sync";
import type { PlanType, PlanWithTotals } from "@/lib/types";
import { AlertCircle, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function defaultTargetDate(monthsAhead = 3): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  return date.toISOString().slice(0, 10);
}

export function PlanHub() {
  const navigate = useNavigate();
  const currentBookId = useAppStore((state) => state.currentBookId);
  const setPendingCount = useAppStore((state) => state.setPendingCount);
  const [plans, setPlans] = useState<PlanWithTotals[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setPlans(await listPlans(currentBookId));
    } catch (err) {
      console.error("Failed to load plans:", err);
      setError("Δεν φορτώθηκαν τα σχέδια.");
    } finally {
      setLoading(false);
    }
  }, [currentBookId]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  async function handleCreate(type: PlanType, name: string) {
    if (creating) return;
    setCreating(true);
    setError("");

    try {
      const plan = await createPlan({
        book_id: currentBookId,
        name,
        type,
        target_date: defaultTargetDate(type === "emergency" ? 6 : 3),
        status: type === "custom" ? "draft" : "active",
        include_in_forecast: type !== "custom",
      });
      setPendingCount(await getPendingCount());
      navigate(`/plans/${plan.id}`);
    } catch (err) {
      console.error("Failed to create plan:", err);
      setError("Δεν δημιουργήθηκε το σχέδιο.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-4">
        <div className="min-w-0">
          <h1 className="text-h2">Σχέδια</h1>
          <p className="mt-0.5 text-caption text-text-muted">
            Οικονομικοί στόχοι και what-if σενάρια
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreate("custom", "Νέο σχέδιο")}
          disabled={creating}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-charcoal text-text-on-dark transition-colors hover:bg-charcoal-soft disabled:opacity-50"
          aria-label="Νέο σχέδιο"
        >
          <Plus className="h-4.5 w-4.5" strokeWidth={1.8} />
        </button>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-expense-light bg-cream p-4 text-expense">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <PlanKpiGrid loading={loading} plans={plans} />

      {loading ? (
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="skel h-40" />
          ))}
        </div>
      ) : plans.length > 0 ? (
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      ) : (
        <section className="mb-5 rounded-md border border-border-light bg-cream p-5 text-center">
          <p className="text-sm font-semibold text-text-primary">Δεν υπάρχουν σχέδια ακόμα.</p>
          <p className="mt-1 text-caption text-text-muted">
            Ξεκίνα από πρότυπο ή άνοιξε ένα κενό σχέδιο.
          </p>
        </section>
      )}

      <PlanTemplates disabled={creating} onCreate={(type, name) => void handleCreate(type, name)} />
    </div>
  );
}
