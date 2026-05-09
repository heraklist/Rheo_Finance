import { TransactionRow, TransactionRowSkeleton } from "@/components/ui/TransactionRow";
import { listTransactions } from "@/lib/transactions";
import type { TransactionWithRelations } from "@/lib/types";
import { cn, formatDateRelative, formatEuro } from "@/lib/utils";
import { AlertCircle, Plus, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface TransactionGroup {
  date: string;
  transactions: TransactionWithRelations[];
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

export function TransactionsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError("");
        const rows = await listTransactions({ bookId: "book-business", limit: 200 });
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
  }, []);

  const groups = groupByDate(transactions);

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
