import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardChartSection } from "@/components/dashboard/DashboardChartSection";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import {
  type BookFilter,
  type DashboardBookOption,
  EMPTY_BOOK_COUNTS,
  isoDate,
  monthLabel,
  type PeriodFilter,
  periodToRange,
} from "@/components/dashboard/dashboardModel";
import { RecentTransactionsSection } from "@/components/dashboard/RecentTransactionsSection";
import {
  type BookTransactionCounts,
  getBookTransactionCounts,
  getMonthlyTotals,
} from "@/lib/analytics";
import { isPersonalBook, useAppStore } from "@/lib/store";
import { getTotals, listTransactions } from "@/lib/transactions";
import type { TransactionWithRelations } from "@/lib/types";

interface Totals {
  income: number;
  expense: number;
  net: number;
  vat_net: number;
}

function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function millisecondsUntilNextLocalDay(from = new Date()): number {
  const nextDay = new Date(from);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(1000, nextDay.getTime() - from.getTime());
}

export function Dashboard() {
  const navigate = useNavigate();
  const currentBookId = useAppStore((state) => state.currentBookId);
  const storeBooks = useAppStore((state) => state.books);
  const [today, setToday] = useState(startOfLocalDay);
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
  const showVat = bookFilter === "all" || !isPersonalBook(storeBooks, bookFilter);

  useEffect(() => {
    let timeoutId: number | undefined;
    const scheduleNextDayTick = () => {
      timeoutId = window.setTimeout(() => {
        setToday(startOfLocalDay());
        scheduleNextDayTick();
      }, millisecondsUntilNextLocalDay());
    };

    scheduleNextDayTick();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    setPeriodFilter((filter) => {
      if (filter.kind === "today" || filter.kind === "week") {
        return { ...filter, date: today };
      }
      return filter;
    });
  }, [today]);

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

  const bookOptions: DashboardBookOption[] = [
    { value: "all", label: "Όλα τα βιβλία", count: bookCounts.all },
    ...storeBooks.map((b) => ({
      value: b.id,
      label: b.name,
      count: b.slug === "business" ? bookCounts.business : bookCounts.personal,
    })),
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
