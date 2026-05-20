import { CoverageChart } from "@/components/coverage/CoverageChart";
import { CoverageRow } from "@/components/coverage/CoverageRow";
import { CoverageSummaryCard } from "@/components/coverage/CoverageSummaryCard";
import { MonthNavigator } from "@/components/coverage/MonthNavigator";
import {
  addCoverageExpense,
  addCoverageIncome,
  buildCumulativeData,
  calculateCoverageSummary,
  deleteCoverageExpense,
  deleteCoverageIncome,
  ensureCoverageMonth,
  listCoverageExpenses,
  listCoverageIncomes,
  toggleExpensePaid,
  toggleIncomeReceived,
} from "@/lib/coverage";
import { useAppStore } from "@/lib/store";
import { getPendingCount } from "@/lib/sync";
import type { CoverageExpense, CoverageIncome, CoverageSummary } from "@/lib/types";
import { AlertCircle, Plus } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

function inputClassName(): string {
  return "h-10 rounded-md border border-border-light bg-cream px-3 text-sm text-text-primary outline-none focus:border-gold";
}

function parseAmount(value: string): number {
  return Number(value.replace(",", "."));
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function dayLabel(day: number, date: Date): string {
  return `${day}/${date.getMonth() + 1}`;
}

function emptyExpenseForm(date: Date) {
  return {
    name: "",
    amount: "",
    due_date: String(Math.min(new Date().getDate(), daysInMonth(date))),
  };
}

function emptyIncomeForm(date: Date) {
  return {
    name: "",
    amount: "",
    expected_date: String(Math.min(new Date().getDate(), daysInMonth(date))),
  };
}

const EMPTY_SUMMARY: CoverageSummary = {
  total_expenses: 0,
  total_income: 0,
  paid_expenses: 0,
  received_income: 0,
  balance: 0,
  coverage_pct: 100,
  payment_progress_pct: 100,
};

export function MonthlyCoverage() {
  const currentBookId = useAppStore((state) => state.currentBookId);
  const setPendingCount = useAppStore((state) => state.setPendingCount);
  const [monthDate, setMonthDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [expenses, setExpenses] = useState<CoverageExpense[]>([]);
  const [incomes, setIncomes] = useState<CoverageIncome[]>([]);
  const [expenseForm, setExpenseForm] = useState(() => emptyExpenseForm(monthDate));
  const [incomeForm, setIncomeForm] = useState(() => emptyIncomeForm(monthDate));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();

  const loadCoverage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await ensureCoverageMonth(currentBookId, month, year);
      const [nextExpenses, nextIncomes] = await Promise.all([
        listCoverageExpenses(currentBookId, month, year),
        listCoverageIncomes(currentBookId, month, year),
      ]);
      setExpenses(nextExpenses);
      setIncomes(nextIncomes);
    } catch (err) {
      console.error("Failed to load monthly coverage:", err);
      setError("Δεν φορτώθηκε η μηνιαία κάλυψη.");
    } finally {
      setLoading(false);
    }
  }, [currentBookId, month, year]);

  useEffect(() => {
    setExpenseForm(emptyExpenseForm(monthDate));
    setIncomeForm(emptyIncomeForm(monthDate));
    void loadCoverage();
  }, [loadCoverage, monthDate]);

  const summary = useMemo(
    () => (loading ? EMPTY_SUMMARY : calculateCoverageSummary(expenses, incomes)),
    [expenses, incomes, loading],
  );
  const chartData = useMemo(
    () => buildCumulativeData(expenses, incomes, daysInMonth(monthDate)),
    [expenses, incomes, monthDate],
  );

  async function refreshPendingAndCoverage() {
    setPendingCount(await getPendingCount());
    await loadCoverage();
  }

  async function handleAddExpense(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await addCoverageExpense({
        book_id: currentBookId,
        name: expenseForm.name,
        amount: parseAmount(expenseForm.amount),
        type: "one_off",
        due_date: Number(expenseForm.due_date),
        month,
        year,
      });
      setExpenseForm(emptyExpenseForm(monthDate));
      await refreshPendingAndCoverage();
    } catch (err) {
      console.error("Failed to add coverage expense:", err);
      setError("Δεν προστέθηκε το έξοδο.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddIncome(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await addCoverageIncome({
        book_id: currentBookId,
        name: incomeForm.name,
        amount: parseAmount(incomeForm.amount),
        confidence: "high",
        expected_date: Number(incomeForm.expected_date),
        month,
        year,
      });
      setIncomeForm(emptyIncomeForm(monthDate));
      await refreshPendingAndCoverage();
    } catch (err) {
      console.error("Failed to add coverage income:", err);
      setError("Δεν προστέθηκε το έσοδο.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCoverageAction(action: () => Promise<void>, errorMessage: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refreshPendingAndCoverage();
    } catch (err) {
      console.error("Failed to update monthly coverage:", err);
      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <MonthNavigator
        date={monthDate}
        onPrevious={() => setMonthDate((current) => addMonths(current, -1))}
        onNext={() => setMonthDate((current) => addMonths(current, 1))}
      />

      {error ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-expense-light bg-cream p-4 text-expense">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <CoverageSummaryCard loading={loading} summary={summary} />

      <section className="mb-5 rounded-md border border-border-light bg-cream p-4">
        <div className="mb-3">
          <p className="text-label uppercase text-text-muted">Σωρευτικό υπόλοιπο</p>
          <p className="text-caption text-text-muted">Με βάση τις αναμενόμενες ημερομηνίες</p>
        </div>
        {loading ? <div className="skel h-44" /> : <CoverageChart data={chartData} />}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-md border border-border-light bg-cream">
          <div className="border-b border-border-light bg-sand px-4 py-3">
            <h2 className="text-h3 text-text-primary">Έξοδα μήνα</h2>
            <p className="text-caption text-text-muted">{expenses.length} εγγραφές</p>
          </div>
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="skel h-12" />
              ))}
            </div>
          ) : expenses.length > 0 ? (
            expenses.map((item) => (
              <CoverageRow
                key={item.id}
                item={item}
                kind="expense"
                done={item.paid}
                dateLabel={dayLabel(item.due_date, monthDate)}
                meta={item.type === "recurring" ? "Πάγιο" : "Μη πάγιο"}
                disabled={busy}
                onToggle={() =>
                  void handleCoverageAction(
                    () => toggleExpensePaid(item.id),
                    "Δεν ενημερώθηκε το έξοδο.",
                  )
                }
                onDelete={() =>
                  void handleCoverageAction(
                    () => deleteCoverageExpense(item.id),
                    "Δεν διαγράφηκε το έξοδο.",
                  )
                }
              />
            ))
          ) : (
            <p className="p-4 text-sm text-text-muted">Δεν υπάρχουν έξοδα για τον μήνα.</p>
          )}
          <form className="grid gap-2 border-t border-border-light p-3" onSubmit={handleAddExpense}>
            <input
              required
              placeholder="Νέο έξοδο"
              value={expenseForm.name}
              onChange={(event) => setExpenseForm({ ...expenseForm, name: event.target.value })}
              className={inputClassName()}
            />
            <div className="grid grid-cols-[1fr_92px] gap-2">
              <input
                required
                inputMode="decimal"
                placeholder="Ποσό"
                value={expenseForm.amount}
                onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })}
                className={inputClassName()}
              />
              <input
                required
                inputMode="numeric"
                placeholder="Ημέρα"
                value={expenseForm.due_date}
                onChange={(event) =>
                  setExpenseForm({ ...expenseForm, due_date: event.target.value })
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
            <h2 className="text-h3 text-text-primary">Αναμενόμενα έσοδα</h2>
            <p className="text-caption text-text-muted">{incomes.length} πηγές</p>
          </div>
          {loading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="skel h-12" />
              ))}
            </div>
          ) : incomes.length > 0 ? (
            incomes.map((item) => (
              <CoverageRow
                key={item.id}
                item={item}
                kind="income"
                done={item.received}
                dateLabel={dayLabel(item.expected_date, monthDate)}
                meta={`Εμπιστοσύνη ${item.confidence}`}
                disabled={busy}
                onToggle={() =>
                  void handleCoverageAction(
                    () => toggleIncomeReceived(item.id),
                    "Δεν ενημερώθηκε το έσοδο.",
                  )
                }
                onDelete={() =>
                  void handleCoverageAction(
                    () => deleteCoverageIncome(item.id),
                    "Δεν διαγράφηκε το έσοδο.",
                  )
                }
              />
            ))
          ) : (
            <p className="p-4 text-sm text-text-muted">Δεν υπάρχουν έσοδα για τον μήνα.</p>
          )}
          <form className="grid gap-2 border-t border-border-light p-3" onSubmit={handleAddIncome}>
            <input
              required
              placeholder="Νέο έσοδο"
              value={incomeForm.name}
              onChange={(event) => setIncomeForm({ ...incomeForm, name: event.target.value })}
              className={inputClassName()}
            />
            <div className="grid grid-cols-[1fr_92px] gap-2">
              <input
                required
                inputMode="decimal"
                placeholder="Ποσό"
                value={incomeForm.amount}
                onChange={(event) => setIncomeForm({ ...incomeForm, amount: event.target.value })}
                className={inputClassName()}
              />
              <input
                required
                inputMode="numeric"
                placeholder="Ημέρα"
                value={incomeForm.expected_date}
                onChange={(event) =>
                  setIncomeForm({ ...incomeForm, expected_date: event.target.value })
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
              Νέο έσοδο
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
