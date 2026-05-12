import { IncomeExpenseChart } from "@/components/charts/IncomeExpenseChart";
import { KPITile } from "@/components/ui/KPITile";
import { TransactionRow, TransactionRowSkeleton } from "@/components/ui/TransactionRow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type BookTransactionCounts,
  getBookTransactionCounts,
  getMonthlyTotals,
} from "@/lib/analytics";
import { useAppStore } from "@/lib/store";
import { getTotals, listTransactions } from "@/lib/transactions";
import type { TransactionWithRelations } from "@/lib/types";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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

function bookLabel(bookId: string): string {
  if (bookId === "all") return "Όλα τα βιβλία";
  return bookId === "book-personal" ? "Προσωπικά" : "Επαγγελματικά";
}

function monthLabel(month: string): string {
  const monthNumber = Number(month.slice(5, 7));
  return MONTHS_SHORT[(monthNumber || 1) - 1] ?? month;
}

interface Totals {
  income: number;
  expense: number;
  net: number;
  vat_net: number;
}

type BookFilter = "all" | "book-business" | "book-personal";

type PeriodFilter =
  | { kind: "month"; year: number; month: number }
  | { kind: "today"; date: Date }
  | { kind: "week"; date: Date }
  | { kind: "quarter"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { kind: "year"; year: number }
  | { kind: "custom"; fromDate: string; toDate: string }
  | { kind: "all" };

interface DateRange {
  label: string;
  fromDate: string;
  toDate: string;
}

const EMPTY_BOOK_COUNTS: BookTransactionCounts = { all: 0, business: 0, personal: 0 };

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentQuarter(date: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

function periodToRange(period: PeriodFilter): DateRange {
  if (period.kind === "today") {
    const date = isoDate(period.date);
    return { label: "Σήμερα", fromDate: date, toDate: date };
  }

  if (period.kind === "week") {
    const weekday = (period.date.getDay() + 6) % 7;
    const start = new Date(period.date);
    start.setDate(period.date.getDate() - weekday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { label: "Αυτή η εβδομάδα", fromDate: isoDate(start), toDate: isoDate(end) };
  }

  if (period.kind === "quarter") {
    const startMonth = (period.quarter - 1) * 3;
    const start = new Date(period.year, startMonth, 1);
    const end = new Date(period.year, startMonth + 3, 0);
    return {
      label: `Q${period.quarter} ${period.year}`,
      fromDate: isoDate(start),
      toDate: isoDate(end),
    };
  }

  if (period.kind === "year") {
    return {
      label: `Έτος ${period.year}`,
      fromDate: `${period.year}-01-01`,
      toDate: `${period.year}-12-31`,
    };
  }

  if (period.kind === "custom") {
    return {
      label: "Προσαρμοσμένη",
      fromDate: period.fromDate,
      toDate: period.toDate,
    };
  }

  if (period.kind === "all") {
    return { label: "Όλη η περίοδος", fromDate: "1900-01-01", toDate: "9999-12-31" };
  }

  const start = new Date(period.year, period.month, 1);
  const end = new Date(period.year, period.month + 1, 0);
  return {
    label: `${MONTHS_GR[period.month]} ${period.year}`,
    fromDate: isoDate(start),
    toDate: isoDate(end),
  };
}

export function Dashboard() {
  const navigate = useNavigate();
  const currentBookId = useAppStore((state) => state.currentBookId);
  const today = useMemo(() => new Date(), []);
  const [bookFilter, setBookFilter] = useState<BookFilter>(currentBookId as BookFilter);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({
    kind: "month",
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [customFromDate, setCustomFromDate] = useState(
    isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [customToDate, setCustomToDate] = useState(
    isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
  );
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [recent, setRecent] = useState<TransactionWithRelations[]>([]);
  const [chartData, setChartData] = useState<
    Array<{ month: string; income: number; expense: number }>
  >([]);
  const [bookCounts, setBookCounts] = useState<BookTransactionCounts>(EMPTY_BOOK_COUNTS);
  const selectedBookId = bookFilter === "all" ? undefined : bookFilter;
  const selectedRange = useMemo(() => periodToRange(periodFilter), [periodFilter]);
  const showVat = bookFilter !== "book-personal";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [t, r, monthly, counts] = await Promise.all([
          getTotals({
            fromDate: selectedRange.fromDate,
            toDate: selectedRange.toDate,
            bookId: selectedBookId,
          }),
          listTransactions({
            limit: 5,
            bookId: selectedBookId,
            fromDate: selectedRange.fromDate,
            toDate: selectedRange.toDate,
          }),
          getMonthlyTotals(selectedBookId),
          getBookTransactionCounts(),
        ]);

        if (!cancelled) {
          setTotals(t);
          setRecent(r);
          setChartData(monthly.map((row) => ({ ...row, month: monthLabel(row.month) })));
          setBookCounts(counts);
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
  }, [selectedBookId, selectedRange.fromDate, selectedRange.toDate]);

  const isEmpty =
    !loading && (!totals || (totals.income === 0 && totals.expense === 0)) && recent.length === 0;

  useEffect(() => {
    setBookFilter(currentBookId as BookFilter);
  }, [currentBookId]);

  const bookOptions: Array<{ value: BookFilter; label: string; count: number }> = [
    { value: "all", label: "Όλα τα βιβλία", count: bookCounts.all },
    { value: "book-business", label: "Επαγγελματικά", count: bookCounts.business },
    { value: "book-personal", label: "Προσωπικά", count: bookCounts.personal },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Filter chips */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-border-light">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="chip active py-2 px-3">
              <Calendar className="w-3 h-3" strokeWidth={2} />
              {selectedRange.label}
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[min(22rem,calc(100vw-2rem))] border-border-light bg-cream"
          >
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setPickerYear((year) => year - 1)}
                className="rounded-md p-1.5 text-charcoal hover:bg-sand"
                aria-label="Προηγούμενο έτος"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
              </button>
              <div className="text-h3">{pickerYear}</div>
              <button
                type="button"
                onClick={() => setPickerYear((year) => year + 1)}
                className="rounded-md p-1.5 text-charcoal hover:bg-sand"
                aria-label="Επόμενο έτος"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
            <div className="text-label uppercase text-text-muted mb-2">Μήνας</div>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {MONTHS_SHORT.map((month, index) => {
                const active =
                  periodFilter.kind === "month" &&
                  periodFilter.year === pickerYear &&
                  periodFilter.month === index;
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() =>
                      setPeriodFilter({ kind: "month", year: pickerYear, month: index })
                    }
                    className={`chip justify-center py-2 ${active ? "active" : ""}`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>
            <div className="text-label uppercase text-text-muted mb-2">Γρήγορη επιλογή</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPeriodFilter({ kind: "today", date: today })}
                className="chip"
              >
                Σήμερα
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter({ kind: "week", date: today })}
                className="chip"
              >
                Αυτή η εβδομάδα
              </button>
              <button
                type="button"
                onClick={() =>
                  setPeriodFilter({
                    kind: "quarter",
                    year: pickerYear,
                    quarter: currentQuarter(new Date(pickerYear, today.getMonth(), 1)),
                  })
                }
                className="chip"
              >
                Τρίμηνο Q{currentQuarter(new Date(pickerYear, today.getMonth(), 1))}
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter({ kind: "year", year: pickerYear })}
                className="chip"
              >
                Έτος {pickerYear}
              </button>
              <button
                type="button"
                onClick={() => setPeriodFilter({ kind: "all" })}
                className="chip"
              >
                Όλη η περίοδος
              </button>
            </div>
            <div className="mt-4 border-t border-border-light pt-3">
              <div className="text-label uppercase text-text-muted mb-2">Προσαρμοσμένη</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(event) => setCustomFromDate(event.target.value)}
                  className="rounded-md border border-border-light bg-cream px-2 py-2 text-xs focus:border-charcoal focus:outline-none"
                />
                <input
                  type="date"
                  value={customToDate}
                  onChange={(event) => setCustomToDate(event.target.value)}
                  className="rounded-md border border-border-light bg-cream px-2 py-2 text-xs focus:border-charcoal focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  setPeriodFilter({
                    kind: "custom",
                    fromDate: customFromDate,
                    toDate: customToDate,
                  })
                }
                className="mt-2 w-full rounded-md border border-border-light bg-sand px-3 py-2 text-sm font-medium text-charcoal"
              >
                Εφαρμογή περιόδου
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="chip py-2 px-3">
              {bookLabel(bookFilter)}
              <ChevronDown className="w-3 h-3" strokeWidth={2} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 border-border-light bg-cream p-1.5">
            {bookOptions.map((book) => (
              <button
                key={book.value}
                type="button"
                onClick={() => setBookFilter(book.value)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                  bookFilter === book.value ? "bg-sand text-charcoal" : "text-text-secondary"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {bookFilter === book.value ? (
                    <Check className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                  <span>{book.label}</span>
                </span>
                <span className="text-caption">{book.count}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
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
        {showVat ? (
          <KPITile
            label="ΦΠΑ Πληρωτέο"
            value={totals?.vat_net}
            sand
            loading={loading}
            empty={isEmpty}
          />
        ) : null}
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
            <ReceiptText className="mx-auto mb-2 h-6 w-6 text-text-muted" strokeWidth={1.5} />
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
