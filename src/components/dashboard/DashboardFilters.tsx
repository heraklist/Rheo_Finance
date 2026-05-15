import {
  type BookFilter,
  type DashboardBookOption,
  type DateRange,
  MONTHS_SHORT,
  type PeriodFilter,
  bookLabel,
  currentQuarter,
} from "@/components/dashboard/dashboardModel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface DashboardFiltersProps {
  bookFilter: BookFilter;
  bookOptions: DashboardBookOption[];
  customFromDate: string;
  customToDate: string;
  periodFilter: PeriodFilter;
  pickerYear: number;
  selectedRange: DateRange;
  today: Date;
  onBookFilterChange: (value: BookFilter) => void;
  onCustomFromDateChange: (value: string) => void;
  onCustomToDateChange: (value: string) => void;
  onPeriodFilterChange: (value: PeriodFilter) => void;
  onPickerYearChange: Dispatch<SetStateAction<number>>;
}

export function DashboardFilters({
  bookFilter,
  bookOptions,
  customFromDate,
  customToDate,
  periodFilter,
  pickerYear,
  selectedRange,
  today,
  onBookFilterChange,
  onCustomFromDateChange,
  onCustomToDateChange,
  onPeriodFilterChange,
  onPickerYearChange,
}: DashboardFiltersProps) {
  return (
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
              onClick={() => onPickerYearChange((year) => year - 1)}
              className="rounded-md p-1.5 text-charcoal hover:bg-sand"
              aria-label="Προηγούμενο έτος"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.7} />
            </button>
            <div className="text-h3">{pickerYear}</div>
            <button
              type="button"
              onClick={() => onPickerYearChange((year) => year + 1)}
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
                    onPeriodFilterChange({ kind: "month", year: pickerYear, month: index })
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
              onClick={() => onPeriodFilterChange({ kind: "today", date: today })}
              className="chip"
            >
              Σήμερα
            </button>
            <button
              type="button"
              onClick={() => onPeriodFilterChange({ kind: "week", date: today })}
              className="chip"
            >
              Αυτή η εβδομάδα
            </button>
            <button
              type="button"
              onClick={() =>
                onPeriodFilterChange({
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
              onClick={() => onPeriodFilterChange({ kind: "year", year: pickerYear })}
              className="chip"
            >
              Έτος {pickerYear}
            </button>
            <button
              type="button"
              onClick={() => onPeriodFilterChange({ kind: "all" })}
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
                onChange={(event) => onCustomFromDateChange(event.target.value)}
                className="rounded-md border border-border-light bg-cream px-2 py-2 text-xs focus:border-charcoal focus:outline-none"
              />
              <input
                type="date"
                value={customToDate}
                onChange={(event) => onCustomToDateChange(event.target.value)}
                className="rounded-md border border-border-light bg-cream px-2 py-2 text-xs focus:border-charcoal focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onPeriodFilterChange({
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
              onClick={() => onBookFilterChange(book.value)}
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
  );
}
