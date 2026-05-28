import { AlertCircle, ArrowLeft, Pencil, ReceiptText, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/TransactionForm";
import { useDisplayAccountName } from "@/hooks/useDisplayAccountName";
import { useReceiptPhotoUrl } from "@/hooks/useReceiptPhotoUrl";
import { deleteTransaction, getTransaction, updateTransaction } from "@/lib/transactions";
import type { TransactionWithRelations } from "@/lib/types";
import { cn, formatDateRelative, formatEuro } from "@/lib/utils";

type EditableTransactionType = "income" | "expense" | "reserve";

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border-light last:border-b-0">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-sm text-text-primary text-right">{value}</dd>
    </div>
  );
}

function editableType(tx: TransactionWithRelations): EditableTransactionType {
  if (tx.category_type === "income") return "income";
  if (tx.category_type === "reserve") return "reserve";
  return "expense";
}

function amountInput(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

function transactionSign(tx: TransactionWithRelations): string {
  if (tx.category_type === "income") return "+";
  if (tx.category_type === "expense") return "−";
  return "";
}

function transactionTypeLabel(tx: TransactionWithRelations): string {
  if (tx.category_type === "income") return "Έσοδο";
  if (tx.category_type === "reserve") return "Άλλο";
  return "Έξοδο";
}

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<TransactionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [error, setError] = useState("");
  const receiptUrl = useReceiptPhotoUrl(transaction?.receipt_photo_path, transaction?.id);
  const displayAccountName = useDisplayAccountName();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) {
        setError("Λείπει το αναγνωριστικό της συναλλαγής.");
        setLoading(false);
        return;
      }

      try {
        setError("");
        const row = await getTransaction(id);
        if (!cancelled) setTransaction(row);
      } catch (err) {
        console.error("Failed to load transaction:", err);
        if (!cancelled) setError("Δεν φορτώθηκε η συναλλαγή.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleUpdate(values: TransactionFormValues) {
    if (!transaction) return;

    try {
      const updated = await updateTransaction({
        id: transaction.id,
        receipt_photo_path: transaction.receipt_photo_path,
        ...values,
      });
      const reloaded = await getTransaction(updated.id);
      setTransaction(reloaded);
      setEditing(false);
    } catch (err) {
      console.error("Failed to update transaction:", err);
      setError("Δεν αποθηκεύτηκαν οι αλλαγές.");
    }
  }

  async function handleDelete() {
    if (!transaction || deleting) return;

    const confirmed = window.confirm(
      `Διαγραφή της συναλλαγής "${transaction.description}"; Η ενέργεια δεν αναιρείται.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      await deleteTransaction(transaction.id);
      navigate("/transactions");
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      setError("Δεν διαγράφηκε η συναλλαγή.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4 space-y-4">
        <div className="skel h-7 w-2/3" />
        <div className="skel h-20" />
        <div className="skel h-56" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="topbar flow-topbar -mx-4 -mt-4 mb-4">
          <Link to="/transactions" aria-label="Πίσω" className="text-charcoal">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-h2">Συναλλαγή</h1>
          <div className="w-5" />
        </div>
        <div className="bg-cream border border-border-light rounded-md p-7 text-center">
          <p className="text-body mb-1">Η συναλλαγή δεν βρέθηκε</p>
          <p className="text-caption">Μπορεί να έχει διαγραφεί.</p>
        </div>
      </div>
    );
  }

  const amountClass =
    transaction.category_type === "income"
      ? "text-income"
      : transaction.category_type === "expense"
        ? "text-expense"
        : "text-text-primary";
  const accountName = displayAccountName(transaction.account_name);

  if (editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="topbar flow-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Πίσω"
              className="text-charcoal"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-h2">Επεξεργασία</h1>
          </div>
          <button type="button" onClick={() => setEditing(false)} className="text-text-muted">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <TransactionForm
          initialValues={{
            amount: amountInput(transaction.amount_gross),
            type: editableType(transaction),
            description: transaction.description,
            bookId: transaction.book_id,
            accountId: transaction.account_id,
            categoryId: transaction.category_id,
            date: transaction.date,
            vatRate: transaction.vat_rate,
            paymentMethod: transaction.payment_method,
            tagName: transaction.tag_name ?? "",
            notes: transaction.notes ?? "",
            receiptPhotoPath: transaction.receipt_photo_path,
          }}
          submitLabel="Αποθήκευση αλλαγών"
          submittingLabel="Αποθήκευση…"
          onSubmit={handleUpdate}
        />
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="topbar flow-topbar -mx-4 -mt-4 mb-4">
        <div className="flex items-center gap-3">
          <Link to="/transactions" aria-label="Πίσω" className="text-charcoal">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-h2">Συναλλαγή</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-2 rounded-md text-text-secondary hover:text-charcoal hover:bg-sand transition-colors"
            aria-label="Επεξεργασία"
          >
            <Pencil className="w-4 h-4" strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-md text-expense hover:bg-expense-light/30 disabled:opacity-50 transition-colors"
            aria-label="Διαγραφή"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-cream border border-expense-light rounded-md p-4 mb-4 text-expense flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <section className="bg-cream border border-border-light rounded-md p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-caption text-text-muted mb-1">{transactionTypeLabel(transaction)}</p>
            <h2 className="text-h2 break-words">{transaction.description}</h2>
          </div>
          <p className={cn("text-num-xl tabular-nums whitespace-nowrap", amountClass)}>
            {transactionSign(transaction)}
            {formatEuro(transaction.amount_gross)}
          </p>
        </div>
        <p className="text-caption text-text-muted mt-3">
          {formatDateRelative(transaction.date)} · {transaction.book_name}
        </p>
      </section>

      <section className="bg-cream border border-border-light rounded-md px-4 mb-4">
        <dl>
          <DetailRow label="Κατηγορία" value={transaction.category_name ?? "—"} />
          <DetailRow label="Λογαριασμός" value={accountName || "—"} />
          <DetailRow label="Τρόπος πληρωμής" value={transaction.payment_method} />
          <DetailRow label="Καθαρό ποσό" value={formatEuro(transaction.amount_net)} />
          <DetailRow
            label={`ΦΠΑ ${Math.round(transaction.vat_rate * 100)}%`}
            value={formatEuro(transaction.amount_vat)}
          />
          <DetailRow label="Tag" value={transaction.tag_name ?? "—"} />
        </dl>
      </section>

      {transaction.notes ? (
        <section className="bg-cream border border-border-light rounded-md p-4 mb-4">
          <h2 className="text-label uppercase text-text-muted mb-2">Σημειώσεις</h2>
          <p className="text-sm whitespace-pre-wrap">{transaction.notes}</p>
        </section>
      ) : null}

      <section className="bg-cream border border-border-light rounded-md p-4 text-text-muted">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sand border border-border-light flex items-center justify-center">
            <ReceiptText className="w-4.5 h-4.5" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm text-text-primary">
              {transaction.receipt_photo_path ? "Υπάρχει απόδειξη" : "Χωρίς απόδειξη"}
            </p>
            <p className="text-caption">
              {transaction.receipt_photo_path
                ? "Η φωτογραφία αποθηκεύτηκε τοπικά και συγχρονίζεται με το cloud."
                : "Δεν έχει συνδεθεί φωτογραφία απόδειξης."}
            </p>
          </div>
        </div>

        {transaction.receipt_photo_path ? (
          <button
            type="button"
            onClick={() => receiptUrl && setReceiptOpen(true)}
            disabled={!receiptUrl}
            className="mt-3 block w-full overflow-hidden rounded-md border border-border-light bg-sand disabled:opacity-70"
          >
            {receiptUrl ? (
              <img src={receiptUrl} alt="" className="max-h-[420px] w-full object-contain" />
            ) : (
              <div className="flex h-36 items-center justify-center text-caption text-text-muted">
                Φόρτωση απόδειξης...
              </div>
            )}
          </button>
        ) : null}
      </section>

      {receiptOpen && receiptUrl ? (
        <dialog
          open
          className="fixed inset-0 z-50 m-0 h-full w-full max-w-none border-0 bg-transparent p-4"
        >
          <button
            type="button"
            aria-label="Κλείσιμο προβολής απόδειξης"
            onClick={() => setReceiptOpen(false)}
            className="absolute inset-0 bg-charcoal/90"
          />
          <button
            type="button"
            onClick={() => setReceiptOpen(false)}
            aria-label="Κλείσιμο"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-charcoal"
          >
            <X className="h-5 w-5" strokeWidth={1.7} />
          </button>
          <div className="relative z-0 flex h-full items-center justify-center">
            <img src={receiptUrl} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
