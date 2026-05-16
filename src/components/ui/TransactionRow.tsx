import { useDisplayAccountName } from "@/hooks/useDisplayAccountName";
import { useReceiptPhotoUrl } from "@/hooks/useReceiptPhotoUrl";
import type { TransactionWithRelations } from "@/lib/types";
import { cn, formatDateRelative, formatEuro } from "@/lib/utils";
import { Receipt, Repeat2 } from "lucide-react";

interface TransactionRowProps {
  tx: TransactionWithRelations;
  onClick?: () => void;
}

export function TransactionRow({ tx, onClick }: TransactionRowProps) {
  const isIncome = tx.category_type === "income";
  const isExpense = tx.category_type === "expense";
  const sign = isIncome ? "+" : isExpense ? "−" : "";
  const amountClass = isIncome ? "pos" : isExpense ? "neg" : "";
  const receiptUrl = useReceiptPhotoUrl(tx.receipt_photo_path, tx.id);
  const displayAccountName = useDisplayAccountName();
  const accountName = displayAccountName(tx.account_name);

  return (
    <button
      type="button"
      onClick={onClick}
      className="tx-row w-full text-left hover:bg-sand/40 transition-colors"
    >
      <div className="tx-thumb relative">
        {receiptUrl ? (
          <img src={receiptUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Receipt className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
        {tx.recurring_template_id ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-cream bg-gold text-text-on-dark">
            <Repeat2 className="h-2.5 w-2.5" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate mb-0.5">
          {tx.description}
        </div>
        <div className="truncate text-caption text-text-muted">
          {tx.category_name}
          {accountName && ` · ${accountName}`}
          {` · ${formatDateRelative(tx.date)}`}
        </div>
      </div>
      <div className={cn("tx-amount", amountClass)}>
        {sign}
        {formatEuro(tx.amount_gross, { compact: false })}
      </div>
    </button>
  );
}

interface TransactionRowSkeletonProps {
  isLast?: boolean;
}

export function TransactionRowSkeleton({ isLast }: TransactionRowSkeletonProps) {
  return (
    <div className={cn("tx-row", isLast && "border-b-0")}>
      <div className="skel w-8 h-8 rounded-full" />
      <div className="flex-1 space-y-1">
        <div className="skel h-3 w-3/5" />
        <div className="skel h-2.5 w-2/5" />
      </div>
      <div className="skel h-3.5 w-16" />
    </div>
  );
}
