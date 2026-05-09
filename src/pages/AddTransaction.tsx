import { findOrCreateTag, listAccounts, listCategories } from "@/lib/reference";
import { createTransaction } from "@/lib/transactions";
import type { Account, Category, PaymentMethod } from "@/lib/types";
import { formatDateRelative } from "@/lib/utils";
import { ArrowLeft, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const VAT_RATES = [
  { label: "24%", value: 0.24 },
  { label: "13%", value: 0.13 },
  { label: "6%", value: 0.06 },
  { label: "0%", value: 0.0 },
];

const PAYMENT_METHODS: PaymentMethod[] = ["Μετρητά", "Κάρτα", "Τραπεζική μεταφορά", "IRIS", "Άλλο"];

type TxType = "income" | "expense" | "reserve";

export function AddTransaction() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [bookId] = useState("book-business");
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vatRate, setVatRate] = useState(0.24);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Μετρητά");
  const [tagName, setTagName] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    void (async () => {
      const accs = await listAccounts(bookId);
      setAccounts(accs);
      setAccountId((current) => current || accs[0]?.id || "");
    })();
  }, [bookId]);

  // When type changes, refresh categories and reset selection
  useEffect(() => {
    void (async () => {
      const cats = await listCategories({ bookId, type });
      setCategories(cats);
      setCategoryId("");
    })();
  }, [type, bookId]);

  async function handleSubmit() {
    if (submitting) return;
    setFormError("");
    const grossNum = Number.parseFloat(amount.replace(",", "."));
    if (!grossNum || grossNum <= 0 || !description || !accountId || !categoryId) {
      setFormError("Συμπλήρωσε ποσό, περιγραφή, κατηγορία και λογαριασμό.");
      return;
    }
    setSubmitting(true);
    try {
      const tag = await findOrCreateTag(tagName);
      await createTransaction({
        date,
        description,
        book_id: bookId,
        account_id: accountId,
        category_id: categoryId,
        tag_id: tag?.id ?? null,
        payment_method: paymentMethod,
        amount_gross: grossNum,
        vat_rate: vatRate,
        notes: notes || null,
      });
      navigate("/");
    } catch (err) {
      console.error("Failed to save transaction:", err);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="topbar">
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

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 pb-24 space-y-4">
        {/* Amount */}
        <div>
          <label className="form-label" htmlFor="tx-amount">
            Ποσό
          </label>
          <input
            id="tx-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00 €"
            autoFocus
            className="w-full bg-cream border border-border-light rounded-md text-[32px] font-bold tracking-tight tabular-nums px-3.5 py-4 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        {/* Type */}
        <div>
          <div className="form-label">Είδος</div>
          <div className="grid grid-cols-3 bg-sand p-0.5 rounded-md border border-border-light">
            {(["income", "expense", "reserve"] as TxType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`text-sm py-2 px-3 rounded-md transition-all ${
                  type === t
                    ? "bg-cream text-text-primary shadow-sm font-medium"
                    : "text-text-secondary"
                }`}
              >
                {t === "income" ? "Έσοδο" : t === "expense" ? "Έξοδο" : "Άλλο"}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="form-label" htmlFor="tx-description">
            Περιγραφή
          </label>
          <input
            id="tx-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="π.χ. Ψώνια λαχαναγορά"
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        {/* Category + Account */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="tx-category">
              Κατηγορία
            </label>
            <select
              id="tx-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal appearance-none"
            >
              <option value="">— Επίλεξε —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="tx-account">
              Λογαριασμός
            </label>
            <select
              id="tx-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal appearance-none"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="form-label" htmlFor="tx-date">
            Ημερομηνία
          </label>
          <input
            id="tx-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
          />
          <p className="text-caption mt-1">{formatDateRelative(date)}</p>
        </div>

        {/* VAT */}
        <div>
          <div className="form-label">ΦΠΑ</div>
          <div className="flex gap-1.5">
            {VAT_RATES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setVatRate(v.value)}
                className={`flex-1 chip py-2 justify-center ${vatRate === v.value ? "active" : ""}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div>
          <label className="form-label" htmlFor="tx-payment-method">
            Τρόπος Πληρωμής
          </label>
          <select
            id="tx-payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal appearance-none"
          >
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Tag (optional) */}
        <div>
          <label className="form-label" htmlFor="tx-tag">
            Tag (προαιρετικό)
          </label>
          <input
            id="tx-tag"
            type="text"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            placeholder="π.χ. Cold Kitchen Project"
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        {/* Receipt photo */}
        <button
          type="button"
          className="w-full flex items-center gap-2.5 bg-cream border border-border-mid text-charcoal rounded-md py-2.5 px-3.5 text-sm font-medium hover:bg-sand transition-colors"
        >
          <Camera className="w-[18px] h-[18px]" strokeWidth={1.5} />
          Φωτογραφία απόδειξης
        </button>

        {/* Notes */}
        <div>
          <label className="form-label" htmlFor="tx-notes">
            Σημειώσεις (προαιρετικό)
          </label>
          <textarea
            id="tx-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal resize-none transition-colors"
          />
        </div>

        {formError ? (
          <p className="text-sm text-expense" role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      {/* Sticky save button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-cream via-cream to-cream/0 border-t border-border-light">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-charcoal text-text-on-dark rounded-md py-3.5 text-[15px] font-medium hover:bg-charcoal-soft disabled:opacity-50 transition-colors"
        >
          {submitting ? "Αποθήκευση…" : "Καταχώρηση"}
        </button>
      </div>
    </div>
  );
}
