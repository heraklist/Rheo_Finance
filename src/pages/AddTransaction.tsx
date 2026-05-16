import {
  TransactionForm,
  type TransactionFormValues,
} from "@/components/transactions/TransactionForm";
import { createTransaction } from "@/lib/transactions";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function AddTransaction() {
  const navigate = useNavigate();

  async function handleSubmit(values: TransactionFormValues) {
    await createTransaction(values);
    navigate("/");
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col overflow-hidden">
      <div className="topbar flow-topbar">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Πίσω" className="text-charcoal">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Link>
          <h1 className="text-h2">Νέα συναλλαγή</h1>
        </div>
        <Link to="/" className="text-text-muted text-sm">
          Ακύρωση
        </Link>
      </div>

      <TransactionForm
        submitLabel="Καταχώρηση"
        submittingLabel="Αποθήκευση…"
        autoFocusAmount
        onSubmit={handleSubmit}
      />
    </div>
  );
}
