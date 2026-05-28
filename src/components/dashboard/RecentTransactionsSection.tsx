import { ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { TransactionRow, TransactionRowSkeleton } from "@/components/ui/TransactionRow";
import type { TransactionWithRelations } from "@/lib/types";

interface RecentTransactionsSectionProps {
  empty: boolean;
  loading: boolean;
  transactions: TransactionWithRelations[];
  onOpenTransaction: (id: string) => void;
}

export function RecentTransactionsSection({
  empty,
  loading,
  transactions,
  onOpenTransaction,
}: RecentTransactionsSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-h3">Πρόσφατες συναλλαγές</h2>
        <Link to="/transactions" className="text-gold text-sm font-medium">
          Δες όλες →
        </Link>
      </div>

      {empty ? (
        <div className="bg-cream border border-border-light rounded-md p-7 text-center">
          <ReceiptText className="mx-auto mb-2 h-6 w-6 text-text-muted" strokeWidth={1.5} />
          <p className="text-body mb-1">Καμία συναλλαγή ακόμα</p>
          <p className="text-caption">Πρόσθεσε την πρώτη σου ↓</p>
        </div>
      ) : loading ? (
        <div className="bg-cream border border-border-light rounded-md overflow-hidden">
          {[0, 1, 2, 3].map((item) => (
            <TransactionRowSkeleton key={item} isLast={item === 3} />
          ))}
        </div>
      ) : (
        <div className="bg-cream border border-border-light rounded-md overflow-hidden">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onClick={() => onOpenTransaction(tx.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
