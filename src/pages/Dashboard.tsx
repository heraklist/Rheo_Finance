import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { KPITile } from "@/components/ui/KPITile";
import { TransactionRow, TransactionRowSkeleton } from "@/components/ui/TransactionRow";
import { getTotals, listTransactions } from "@/lib/transactions";
import type { TransactionWithRelations } from "@/lib/types";
import { Calendar, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const MONTHS_GR = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const MONTHS_SHORT = [
  "Ιαν",
  "Φεβ",
  "Μαρ",
  "Απρ",
  "Μάι",
  "Ιουν",
  "Ιουλ",
  "Αυγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
];

interface Totals {
  income: number;
  expense: number;
  net: number;
  vat_net: number;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [recent, setRecent] = useState<TransactionWithRelations[]>([]);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fromDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const toDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const [t, r] = await Promise.all([
          getTotals({ fromDate, toDate, bookId: "book-business" }),
          listTransactions({ limit: 5, bookId: "book-business" }),
        ]);

        if (!cancelled) {
          setTotals(t);
          setRecent(r);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [currentMonth, currentYear]);

  const isEmpty =
    !loading && (!totals || (totals.income === 0 && totals.expense === 0)) && recent.length === 0;

  // Mock chart data for now (will compute from DB in Phase 2)
  const chartData = MONTHS_SHORT.map((m, i) => ({
    month: m,
    income: i === currentMonth ? (totals?.income ?? 0) : 0,
    expense: i === currentMonth ? (totals?.expense ?? 0) : 0,
  }));

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Filter chips */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-border-light">
        <button type="button" className="chip active py-2 px-3">
          <Calendar className="w-3 h-3" strokeWidth={2} />
          {MONTHS_GR[currentMonth]} {currentYear}
          <ChevronDown className="w-3 h-3" strokeWidth={2} />
        </button>
        <button type="button" className="chip py-2 px-3">
          Επαγγελματικά
          <ChevronDown className="w-3 h-3" strokeWidth={2} />
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        <KPITile
          label="Έσοδα"
          value={totals?.income}
          accent="income"
          loading={loading}
          empty={isEmpty}
        />
        <KPITile
          label="Έξοδα"
          value={totals?.expense}
          accent="expense"
          loading={loading}
          empty={isEmpty}
        />
        <KPITile label="Καθαρό" value={totals?.net} sand loading={loading} empty={isEmpty} />
        <KPITile
          label="ΦΠΑ Πληρωτέο"
          value={totals?.vat_net}
          sand
          loading={loading}
          empty={isEmpty}
        />
      </div>

      {/* Chart */}
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
        ) : isEmpty ? (
          <div className="bg-cream border border-border-light rounded-md h-[120px] flex items-center justify-center">
            <p className="text-caption">Καμία δραστηριότητα για αυτή την περίοδο</p>
          </div>
        ) : (
          <IncomeExpenseChart data={chartData} />
        )}
      </section>

      {/* Recent transactions */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-h3">Πρόσφατες συναλλαγές</h2>
          <Link to="/transactions" className="text-gold text-sm font-medium">
            Δες όλες →
          </Link>
        </div>

        {isEmpty ? (
          <div className="bg-cream border border-border-light rounded-md p-7 text-center">
            <div className="text-text-muted mb-2 text-2xl">📋</div>
            <p className="text-body mb-1">Καμία συναλλαγή ακόμα</p>
            <p className="text-caption">Πρόσθεσε την πρώτη σου ↓</p>
          </div>
        ) : loading ? (
          <div className="bg-cream border border-border-light rounded-md overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <TransactionRowSkeleton key={i} isLast={i === 3} />
            ))}
          </div>
        ) : (
          <div className="bg-cream border border-border-light rounded-md overflow-hidden">
            {recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                onClick={() => navigate(`/transactions/${tx.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
