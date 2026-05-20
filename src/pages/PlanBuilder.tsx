import {
  createPlanExpenseItem,
  createPlanIncomeItem,
  deletePlan,
  deletePlanExpenseItem,
  deletePlanIncomeItem,
  getPlan,
  listPlanExpenseItems,
  listPlanIncomeItems,
  togglePlanExpenseIncluded,
  togglePlanIncomeIncluded,
  updatePlan,
} from "@/lib/plans";
import { useAppStore } from "@/lib/store";
import { getPendingCount } from "@/lib/sync";
import type {
  Confidence,
  PlanExpenseItem,
  PlanIncomeItem,
  PlanItemType,
  PlanStatus,
  PlanType,
  PlanWithTotals,
  Priority,
} from "@/lib/types";
import { cn, formatEuro } from "@/lib/utils";
import { AlertCircle, ArrowLeft, Check, Plus, Save, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const PLAN_TYPES: Array<{ value: PlanType; label: string }> = [
  { value: "purchase", label: "Αγορά" },
  { value: "project", label: "Project" },
  { value: "travel", label: "Ταξίδι" },
  { value: "emergency", label: "Αποθεματικό" },
  { value: "debt", label: "Αποπληρωμή" },
  { value: "custom", label: "Σχέδιο" },
];

const STATUSES: Array<{ value: PlanStatus; label: string }> = [
  { value: "draft", label: "Πρόχειρο" },
  { value: "active", label: "Ενεργό" },
  { value: "paused", label: "Σε παύση" },
  { value: "completed", label: "Ολοκληρωμένο" },
];

function parseAmount(value: string): number {
  return Number(value.replace(",", "."));
}

function emptyExpenseForm() {
  return {
    name: "",
    amount: "",
    category: "",
    type: "one_off" as PlanItemType,
    priority: "essential" as Priority,
    target_month: "1",
    duration_months: "1",
  };
}

function emptyIncomeForm() {
  return {
    name: "",
    amount: "",
    category: "",
    type: "one_off" as PlanItemType,
    confidence: "high" as Confidence,
    target_month: "1",
    duration_months: "1",
  };
}

function inputClassName(): string {
  return "h-10 rounded-md border border-border-light bg-cream px-3 text-sm text-text-primary outline-none focus:border-gold";
}

function MiniStat({
  label,
  value,
  className,
}: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-md border border-border-light bg-cream p-3">
      <p className="text-[10px] uppercase text-text-muted">{label}</p>
      <p className={cn("mt-1 truncate text-num-md tabular-nums text-text-primary", className)}>
        {value}
      </p>
    </div>
  );
}

function ItemRow({
  name,
  amount,
  included,
  meta,
  tone,
  onToggle,
  onDelete,
  disabled,
}: {
  name: string;
  amount: number;
  included: boolean;
  meta: string;
  tone: "income" | "expense";
  onToggle: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border-light px-3 py-3 last:border-b-0",
        !included && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border disabled:opacity-50",
          included
            ? "border-transparent bg-charcoal text-text-on-dark"
            : "border-border-mid bg-cream",
        )}
        aria-label={included ? "Εξαίρεση" : "Συμπερίληψη"}
      >
        {included ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
        <p className="mt-0.5 truncate text-caption text-text-muted">{meta}</p>
      </div>
      <p
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          tone === "income" ? "text-income" : "text-expense",
        )}
      >
        {formatEuro(amount, { compact: true })}
      </p>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-expense-light/40 hover:text-expense disabled:opacity-50"
        aria-label="Διαγραφή"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
      </button>
    </div>
  );
}

export function PlanBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setPendingCount = useAppStore((state) => state.setPendingCount);
  const [plan, setPlan] = useState<PlanWithTotals | null>(null);
  const [expenses, setExpenses] = useState<PlanExpenseItem[]>([]);
  const [incomes, setIncomes] = useState<PlanIncomeItem[]>([]);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [incomeForm, setIncomeForm] = useState(emptyIncomeForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadPlan = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const [nextPlan, nextExpenses, nextIncomes] = await Promise.all([
        getPlan(id),
        listPlanExpenseItems(id),
        listPlanIncomeItems(id),
      ]);
      setPlan(nextPlan);
      setExpenses(nextExpenses);
      setIncomes(nextIncomes);
    } catch (err) {
      console.error("Failed to load plan:", err);
      setError("Δεν φορτώθηκε το σχέδιο.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  async function refreshPendingAndPlan() {
    setPendingCount(await getPendingCount());
    await loadPlan();
  }

  async function handleSavePlan() {
    if (!plan || busy) return;
    setBusy(true);
    setError("");
    try {
      await updatePlan(plan.id, {
        name: plan.name,
        type: plan.type,
        target_date: plan.target_date,
        status: plan.status,
        include_in_forecast: plan.include_in_forecast,
        notes: plan.notes,
      });
      await refreshPendingAndPlan();
    } catch (err) {
      console.error("Failed to save plan:", err);
      setError("Δεν αποθηκεύτηκε το σχέδιο.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePlan() {
    if (!plan || busy) return;
    if (!window.confirm(`Διαγραφή του σχεδίου "${plan.name}";`)) return;
    setBusy(true);
    try {
      await deletePlan(plan.id);
      setPendingCount(await getPendingCount());
      navigate("/plans");
    } catch (err) {
      console.error("Failed to delete plan:", err);
      setError("Δεν διαγράφηκε το σχέδιο.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddExpense(event: FormEvent) {
    event.preventDefault();
    if (!plan || busy) return;
    setBusy(true);
    setError("");
    try {
      await createPlanExpenseItem({
        plan_id: plan.id,
        name: expenseForm.name,
        amount: parseAmount(expenseForm.amount),
        category: expenseForm.category,
        type: expenseForm.type,
        priority: expenseForm.priority,
        target_month: Number(expenseForm.target_month),
        duration_months: Number(expenseForm.duration_months),
      });
      setExpenseForm(emptyExpenseForm());
      await refreshPendingAndPlan();
    } catch (err) {
      console.error("Failed to add plan expense:", err);
      setError("Δεν προστέθηκε το έξοδο.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddIncome(event: FormEvent) {
    event.preventDefault();
    if (!plan || busy) return;
    setBusy(true);
    setError("");
    try {
      await createPlanIncomeItem({
        plan_id: plan.id,
        name: incomeForm.name,
        amount: parseAmount(incomeForm.amount),
        category: incomeForm.category,
        type: incomeForm.type,
        confidence: incomeForm.confidence,
        target_month: Number(incomeForm.target_month),
        duration_months: Number(incomeForm.duration_months),
      });
      setIncomeForm(emptyIncomeForm());
      await refreshPendingAndPlan();
    } catch (err) {
      console.error("Failed to add plan income:", err);
      setError("Δεν προστέθηκε το έσοδο.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="skel h-16" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skel h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="px-4 pb-24 pt-4">
        <button
          type="button"
          onClick={() => navigate("/plans")}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
          Πίσω
        </button>
        <section className="rounded-md border border-border-light bg-cream p-5">
          <p className="text-sm text-text-primary">Το σχέδιο δεν βρέθηκε.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-4">
        <button
          type="button"
          onClick={() => navigate("/plans")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border-light text-text-secondary hover:bg-sand"
          aria-label="Πίσω"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-h2">{plan.name}</h1>
          <p className="text-caption text-text-muted">Scenario builder</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSavePlan()}
          disabled={busy}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-charcoal text-text-on-dark hover:bg-charcoal-soft disabled:opacity-50"
          aria-label="Αποθήκευση"
        >
          <Save className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-expense-light bg-cream p-4 text-expense">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <section className="mb-5 rounded-md border border-border-light bg-cream p-4">
        <div className="grid gap-3 md:grid-cols-[1.2fr_0.7fr_0.7fr]">
          <label className="block">
            <span className="form-label">Όνομα</span>
            <input
              value={plan.name}
              onChange={(event) => setPlan({ ...plan, name: event.target.value })}
              className={cn(inputClassName(), "w-full")}
            />
          </label>
          <label className="block">
            <span className="form-label">Τύπος</span>
            <select
              value={plan.type}
              onChange={(event) => setPlan({ ...plan, type: event.target.value as PlanType })}
              className={cn(inputClassName(), "w-full")}
            >
              {PLAN_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="form-label">Κατάσταση</span>
            <select
              value={plan.status}
              onChange={(event) => setPlan({ ...plan, status: event.target.value as PlanStatus })}
              className={cn(inputClassName(), "w-full")}
            >
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="form-label">Ημερομηνία στόχου</span>
            <input
              type="date"
              value={plan.target_date ?? ""}
              onChange={(event) => setPlan({ ...plan, target_date: event.target.value || null })}
              className={cn(inputClassName(), "w-full")}
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-border-light bg-sand/60 px-3 py-2 md:mt-5">
            <input
              type="checkbox"
              checked={plan.include_in_forecast}
              onChange={(event) => setPlan({ ...plan, include_in_forecast: event.target.checked })}
            />
            <span className="text-sm font-medium text-text-primary">Μέσα στην πρόβλεψη</span>
          </label>
          <button
            type="button"
            onClick={() => void handleDeletePlan()}
            disabled={busy}
            className="rounded-md border border-expense-light px-3 py-2 text-sm font-semibold text-expense hover:bg-expense-light/30 disabled:opacity-50 md:mt-5"
          >
            Διαγραφή
          </button>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <MiniStat label="Έξοδα" value={formatEuro(plan.total_expenses)} className="text-expense" />
        <MiniStat label="Πηγές" value={formatEuro(plan.total_income)} className="text-income" />
        <MiniStat label="Κενό" value={formatEuro(Math.max(0, plan.funding_gap))} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-border-light bg-cream">
          <div className="border-b border-border-light bg-sand px-4 py-3">
            <h2 className="text-h3 text-text-primary">Έξοδα σχεδίου</h2>
            <p className="text-caption text-text-muted">{expenses.length} εγγραφές</p>
          </div>
          {expenses.map((item) => (
            <ItemRow
              key={item.id}
              name={item.name}
              amount={item.amount * item.duration_months}
              included={item.included}
              meta={`${item.category || "Χωρίς κατηγορία"} · μήνας ${item.target_month}`}
              tone="expense"
              disabled={busy}
              onToggle={() => void togglePlanExpenseIncluded(item.id).then(refreshPendingAndPlan)}
              onDelete={() => void deletePlanExpenseItem(item.id).then(refreshPendingAndPlan)}
            />
          ))}
          <form className="grid gap-2 border-t border-border-light p-3" onSubmit={handleAddExpense}>
            <input
              required
              placeholder="Νέο έξοδο"
              value={expenseForm.name}
              onChange={(event) => setExpenseForm({ ...expenseForm, name: event.target.value })}
              className={inputClassName()}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                inputMode="decimal"
                placeholder="Ποσό"
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                className={inputClassName()}
              />
              <input
                placeholder="Κατηγορία"
                value={expenseForm.category}
                onChange={(event) =>
                  setExpenseForm({ ...expenseForm, category: event.target.value })
                }
                className={inputClassName()}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-charcoal px-3 text-sm font-semibold text-text-on-dark disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={1.7} />
              Νέο έξοδο
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-md border border-border-light bg-cream">
          <div className="border-b border-border-light bg-sand px-4 py-3">
            <h2 className="text-h3 text-text-primary">Πηγές χρηματοδότησης</h2>
            <p className="text-caption text-text-muted">{incomes.length} εγγραφές</p>
          </div>
          {incomes.map((item) => (
            <ItemRow
              key={item.id}
              name={item.name}
              amount={item.amount * item.duration_months}
              included={item.included}
              meta={`${item.category || "Χωρίς κατηγορία"} · ${item.confidence}`}
              tone="income"
              disabled={busy}
              onToggle={() => void togglePlanIncomeIncluded(item.id).then(refreshPendingAndPlan)}
              onDelete={() => void deletePlanIncomeItem(item.id).then(refreshPendingAndPlan)}
            />
          ))}
          <form className="grid gap-2 border-t border-border-light p-3" onSubmit={handleAddIncome}>
            <input
              required
              placeholder="Νέο έσοδο"
              value={incomeForm.name}
              onChange={(event) => setIncomeForm({ ...incomeForm, name: event.target.value })}
              className={inputClassName()}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                inputMode="decimal"
                placeholder="Ποσό"
                value={incomeForm.amount}
                onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })}
                className={inputClassName()}
              />
              <input
                placeholder="Κατηγορία"
                value={incomeForm.category}
                onChange={(event) => setIncomeForm({ ...incomeForm, category: event.target.value })}
                className={inputClassName()}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-charcoal px-3 text-sm font-semibold text-text-on-dark disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={1.7} />
              Νέο έσοδο
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
