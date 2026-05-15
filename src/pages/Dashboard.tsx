import { DashboardChartSection } from "@/components/dashboard/DashboardChartSection";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { RecentTransactionsSection } from "@/components/dashboard/RecentTransactionsSection";
import {
  type BookFilter,
  EMPTY_BOOK_COUNTS,
  type PeriodFilter,
  isoDate,
  monthLabel,
  periodToRange,
} from "@/components/dashboard/dashboardModel";
import {
  type BookTransactionCounts,
  getBookTransactionCounts,
  getMonthlyTotals,
} from "@/lib/analytics";
import { useAppStore } from "@/lib/store";
import { getTotals, listTransactions } from "@/lib/transactions";
import type { TransactionWithRelations } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Totals {
  income: number;
  expense: number;
  net: number;
  vat_net: number;
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
        const [nextTotals, nextRecent, monthly, counts] = await Promise.all([
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
          setTotals(nextTotals);
          setRecent(nextRecent);
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

  useEffect(() => {
    setBookFilter(currentBookId as BookFilter);
  }, [currentBookId]);

  const isEmpty =
    !loading && (!totals || (totals.income === 0 && totals.expense === 0)) && recent.length === 0;

  const bookOptions = [
    { value: "all" as const, label: "Όλα τα βιβλία", count: bookCounts.all },
    { value: "book-business" as const, label: "Επαγγελματικά", count: bookCounts.business },
    { value: "book-personal" as const, label: "Προσωπικά", count: bookCounts.personal },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      <DashboardFilters
        bookFilter={bookFilter}
        bookOptions={bookOptions}
        customFromDate={customFromDate}
        customToDate={customToDate}
        periodFilter={periodFilter}
        pickerYear={pickerYear}
        selectedRange={selectedRange}
        today={today}
        onBookFilterChange={setBookFilter}
        onCustomFromDateChange={setCustomFromDate}
        onCustomToDateChange={setCustomToDate}
        onPeriodFilterChange={setPeriodFilter}
        onPickerYearChange={setPickerYear}
      />

      <DashboardKpiGrid empty={isEmpty} loading={loading} showVat={showVat} totals={totals} />

      <DashboardChartSection data={chartData} empty={isEmpty} loading={loading} />

      <RecentTransactionsSection
        empty={isEmpty}
        loading={loading}
        transactions={recent}
        onOpenTransaction={(id) => navigate(`/transactions/${id}`)}
      />
    </div>
  );
}
