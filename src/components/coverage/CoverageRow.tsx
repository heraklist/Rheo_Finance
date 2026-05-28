import { Check, Trash2 } from "lucide-react";
import type { CoverageExpense, CoverageIncome } from "@/lib/types";
import { cn, formatEuro } from "@/lib/utils";

type CoverageRowItem = CoverageExpense | CoverageIncome;

interface CoverageRowProps {
  item: CoverageRowItem;
  kind: "expense" | "income";
  done: boolean;
  dateLabel: string;
  meta: string;
  onToggle: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function CoverageRow({
  item,
  kind,
  done,
  dateLabel,
  meta,
  onToggle,
  onDelete,
  disabled = false,
}: CoverageRowProps) {
  const toneClass = kind === "income" ? "text-income" : "text-expense";
  const fillClass = kind === "income" ? "bg-income" : "bg-expense";

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border-light px-3 py-3 last:border-b-0",
        done ? "bg-sand/70 opacity-75" : "bg-cream",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border transition-colors disabled:opacity-50",
          done ? `${fillClass} border-transparent text-text-on-dark` : "border-border-mid bg-cream",
        )}
        aria-label={done ? "Αναίρεση" : "Ολοκλήρωση"}
      >
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-semibold text-text-primary",
            done && "line-through",
          )}
        >
          {item.name}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-text-muted">
          {dateLabel} · {meta}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold tabular-nums", toneClass)}>
          {formatEuro(item.amount, { compact: true })}
        </p>
        <p className="text-[10px] text-text-muted">
          {kind === "income"
            ? done
              ? "Εισπράχθηκε"
              : "Αναμένεται"
            : done
              ? "Πληρώθηκε"
              : "Εκκρεμεί"}
        </p>
      </div>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-expense-light/40 hover:text-expense disabled:opacity-50"
        aria-label="Διαγραφή"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
      </button>
    </div>
  );
}
