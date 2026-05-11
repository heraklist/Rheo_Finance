import { TransactionRow, TransactionRowSkeleton } from "@/components/ui/TransactionRow";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDebounce } from "@/hooks/useDebounce";
import { listCategories } from "@/lib/reference";
import { listTransactions } from "@/lib/transactions";
import type { Category, TransactionWithRelations } from "@/lib/types";
import { cn, formatDateRelative, formatEuro } from "@/lib/utils";
import { AlertCircle, Filter, Plus, ReceiptText, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const CURRENT_BOOK_ID = "book-business";
const ALL_CATEGORIES = "all";

interface TransactionGroup {
  date: string;
  transactions: TransactionWithRelations[];
}

interface TransactionFilters {
  fromDate?: string;
  toDate?: string;
  categoryId?: string;
  minAmount?: number;
  maxAmount?: number;
}

function groupByDate(transactions: TransactionWithRelations[]): TransactionGroup[] {
  const groups = new Map<string, TransactionWithRelations[]>();

  for (const tx of transactions) {
    const dateTransactions = groups.get(tx.date) ?? [];
    dateTransactions.push(tx);
    groups.set(tx.date, dateTransactions);
  }

  return Array.from(groups.entries()).map(([date, txs]) => ({
    date,
    transactions: txs,
  }));
}

function signedAmount(tx: TransactionWithRelations): number {
  if (tx.category_type === "income") return tx.amount_gross;
  if (tx.category_type === "expense") return -tx.amount_gross;
  return 0;
}

function groupTotal(transactions: TransactionWithRelations[]): number {
  return transactions.reduce((total, tx) => total + signedAmount(tx), 0);
}

function parseAmountFilter(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isNaN(parsed) ? undefined : parsed;
}

function filtersFromSearchParams(searchParams: URLSearchParams): TransactionFilters {
  return {
    fromDate: searchParams.get("fromDate") || undefined,
    toDate: searchParams.get("toDate") || undefined,
    categoryId: searchParams.get("categoryId") || undefined,
    minAmount: parseAmountFilter(searchParams.get("minAmount") ?? ""),
    maxAmount: parseAmountFilter(searchParams.get("maxAmount") ?? ""),
  };
}

export function TransactionsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TransactionFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const debouncedSearch = useDebounce(search, 250);

  useEffect(() => {
    setFilters(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const rows = await listCategories({ bookId: CURRENT_BOOK_ID });
        if (!cancelled) setCategories(rows);
      } catch (err) {
        console.error("Failed to load transaction filters:", err);
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const rows = await listTransactions({
          bookId: CURRENT_BOOK_ID,
          limit: 200,
          search: debouncedSearch,
          ...filters,
        });
        if (!cancelled) setTransactions(rows);
      } catch (err) {
        console.error("Failed to load transactions:", err);
        if (!cancelled) setError("Δεν φορτώθηκαν οι συναλλαγές.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filters]);

  const groups = groupByDate(transactions);
  const hasSearch = debouncedSearch.trim().length > 0;
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined && value !== "",
  ).length;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light">
        <div>
          <h1 className="text-h2">Συναλλαγές</h1>
          <p className="text-caption mt-0.5">Επαγγελματικά βιβλία</p>
        </div>
        <Link
          to="/add"
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-charcoal text-text-on-dark hover:bg-charcoal-soft transition-colors"
          aria-label="Νέα συναλλαγή"
        >
          <Plus className="w-4.5 h-4.5" strokeWidth={1.8} />
        </Link>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            type="text"
            placeholder="Αναζήτηση συναλλαγών…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9 bg-cream border-border-light"
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative inline-flex items-center justify-center w-10 h-10 rounded-md border border-border-light text-charcoal hover:bg-sand transition-colors"
              aria-label="Φίλτρα"
            >
              <Filter className="w-4 h-4" strokeWidth={1.7} />
              {activeFilterCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-charcoal text-text-on-dark text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-cream max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Φίλτρα</SheetTitle>
            </SheetHeader>

            <div className="space-y-5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label" htmlFor="filter-from-date">
                    Από ημερομηνία
                  </label>
                  <Input
                    id="filter-from-date"
                    type="date"
                    value={filters.fromDate ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        fromDate: event.target.value || undefined,
                      }))
                    }
                    className="bg-cream border-border-light"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="filter-to-date">
                    Έως ημερομηνία
                  </label>
                  <Input
                    id="filter-to-date"
                    type="date"
                    value={filters.toDate ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        toDate: event.target.value || undefined,
                      }))
                    }
                    className="bg-cream border-border-light"
                  />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="filter-category">
                  Κατηγορία
                </label>
                <Select
                  value={filters.categoryId ?? ALL_CATEGORIES}
                  onValueChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      categoryId: value === ALL_CATEGORIES ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger id="filter-category" className="bg-cream border-border-light">
                    <SelectValue placeholder="— Όλες —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES}>— Όλες —</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label" htmlFor="filter-min-amount">
                    Ελάχιστο €
                  </label>
                  <Input
                    id="filter-min-amount"
                    type="number"
                    step="0.01"
                    value={filters.minAmount ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        minAmount: parseAmountFilter(event.target.value),
                      }))
                    }
                    className="bg-cream border-border-light"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="filter-max-amount">
                    Μέγιστο €
                  </label>
                  <Input
                    id="filter-max-amount"
                    type="number"
                    step="0.01"
                    value={filters.maxAmount ?? ""}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        maxAmount: parseAmountFilter(event.target.value),
                      }))
                    }
                    className="bg-cream border-border-light"
                  />
                </div>
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => setFilters({})}
                  className="w-full flex items-center justify-center gap-2 text-expense text-sm font-medium py-2 border border-expense rounded-md hover:bg-expense-light/30 transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.7} />
                  Καθαρισμός φίλτρων
                </button>
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {error ? (
        <div className="bg-cream border border-expense-light rounded-md p-4 text-expense flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="bg-cream border border-border-light rounded-md overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <TransactionRowSkeleton key={item} isLast={item === 5} />
          ))}
        </div>
      ) : transactions.length === 0 && !error && (hasSearch || hasActiveFilters) ? (
        <div className="bg-cream border border-border-light rounded-md p-7 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-sand border border-border-light flex items-center justify-center text-text-muted">
            <Search className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-body mb-1">Δεν βρέθηκαν αποτελέσματα</p>
          <p className="text-caption">Δοκίμασε άλλη αναζήτηση ή καθάρισε τα φίλτρα.</p>
        </div>
      ) : transactions.length === 0 && !error ? (
        <div className="bg-cream border border-border-light rounded-md p-7 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-sand border border-border-light flex items-center justify-center text-text-muted">
            <ReceiptText className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-body mb-1">Καμία συναλλαγή ακόμα</p>
          <p className="text-caption mb-4">Ξεκίνα με την πρώτη καταχώρηση.</p>
          <Link
            to="/add"
            className="inline-flex items-center gap-2 bg-charcoal text-text-on-dark rounded-md px-3.5 py-2 text-sm font-medium hover:bg-charcoal-soft transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            Νέα συναλλαγή
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const total = groupTotal(group.transactions);
            return (
              <section key={group.date}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-label uppercase text-text-muted">
                    {formatDateRelative(group.date)}
                  </h2>
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      total > 0 && "text-income",
                      total < 0 && "text-expense",
                      total === 0 && "text-text-muted",
                    )}
                  >
                    {formatEuro(total)}
                  </span>
                </div>
                <div className="bg-cream border border-border-light rounded-md overflow-hidden">
                  {group.transactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      onClick={() => navigate(`/transactions/${tx.id}`)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
