import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDisplayAccountName } from "@/hooks/useDisplayAccountName";
import { useReceiptPhotoUrl } from "@/hooks/useReceiptPhotoUrl";
import { parseGreekAmount } from "@/lib/money";
import { type ReceiptPhotoDraft, pickReceiptPhoto } from "@/lib/receipts";
import { findOrCreateTag, listAccounts, listCategories } from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import type { Account, Category, PaymentMethod } from "@/lib/types";
import { formatDateRelative } from "@/lib/utils";
import { Camera, X } from "lucide-react";
import { useEffect, useState } from "react";

const VAT_RATES = [
  { label: "24%", value: 0.24 },
  { label: "13%", value: 0.13 },
  { label: "6%", value: 0.06 },
  { label: "0%", value: 0 },
];

const PAYMENT_METHODS: PaymentMethod[] = ["Μετρητά", "Κάρτα", "Τραπεζική μεταφορά", "IRIS", "Άλλο"];

const BOOK_OPTIONS = [
  { label: "Επαγγελματικά", value: "book-business" },
  { label: "Προσωπικά", value: "book-personal" },
];

type TxType = "income" | "expense" | "reserve";

export interface TransactionFormValues {
  date: string;
  description: string;
  book_id: string;
  account_id: string;
  category_id: string;
  tag_id?: string | null;
  payment_method: PaymentMethod;
  amount_gross: number;
  vat_rate: number;
  receipt_photo_bytes?: Uint8Array | null;
  remove_receipt_photo?: boolean;
  notes?: string | null;
}

interface TransactionFormProps {
  initialValues?: {
    amount: string;
    type: TxType;
    description: string;
    bookId: string;
    accountId: string;
    categoryId: string;
    date: string;
    vatRate: number;
    paymentMethod: PaymentMethod;
    tagName: string;
    notes: string;
    receiptPhotoPath?: string | null;
  };
  submitLabel: string;
  submittingLabel: string;
  autoFocusAmount?: boolean;
  onSubmit: (values: TransactionFormValues) => Promise<void>;
}

function defaultValues(input: {
  bookId: string;
  vatRate: number;
  paymentMethod: PaymentMethod;
}): NonNullable<TransactionFormProps["initialValues"]> {
  return {
    amount: "",
    type: "expense",
    description: "",
    bookId: input.bookId,
    accountId: "",
    categoryId: "",
    date: new Date().toISOString().slice(0, 10),
    vatRate: input.vatRate,
    paymentMethod: input.paymentMethod,
    tagName: "",
    notes: "",
    receiptPhotoPath: null,
  };
}

export function TransactionForm({
  initialValues,
  submitLabel,
  submittingLabel,
  autoFocusAmount = false,
  onSubmit,
}: TransactionFormProps) {
  const preferredBookId = useAppStore((state) => state.currentBookId);
  const defaultVatRate = useAppStore((state) => state.defaultVatRate);
  const defaultPaymentMethod = useAppStore((state) => state.defaultPaymentMethod);
  const defaults =
    initialValues ??
    defaultValues({
      bookId: preferredBookId,
      vatRate: defaultVatRate,
      paymentMethod: defaultPaymentMethod,
    });
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [bookId, setBookId] = useState(defaults.bookId);
  const [type, setType] = useState<TxType>(defaults.type);
  const [amount, setAmount] = useState(defaults.amount);
  const [description, setDescription] = useState(defaults.description);
  const [accountId, setAccountId] = useState(defaults.accountId);
  const [categoryId, setCategoryId] = useState(defaults.categoryId);
  const [date, setDate] = useState(defaults.date);
  const [vatRate, setVatRate] = useState(defaults.vatRate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaults.paymentMethod);
  const [tagName, setTagName] = useState(defaults.tagName);
  const [notes, setNotes] = useState(defaults.notes);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptPhotoDraft | null>(null);
  const [receiptRemoved, setReceiptRemoved] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");
  const existingReceiptUrl = useReceiptPhotoUrl(receiptRemoved ? null : defaults.receiptPhotoPath);
  const receiptPreviewUrl = receiptDraft?.previewUrl ?? existingReceiptUrl;
  const displayAccountName = useDisplayAccountName();
  const showVat = bookId === "book-business";
  const vatLabel = type === "income" ? "ΦΠΑ (εκροών)" : "ΦΠΑ (εισροών)";

  useEffect(() => {
    void (async () => {
      const accs = await listAccounts(bookId);
      setAccounts(accs);
      setAccountId((current) => {
        if (current && accs.some((account) => account.id === current)) return current;
        return accs[0]?.id || "";
      });
    })();
  }, [bookId]);

  useEffect(() => {
    void (async () => {
      const cats = await listCategories({ bookId, type });
      setCategories(cats);
      setCategoryId((current) => {
        if (current && cats.some((category) => category.id === current)) return current;
        return "";
      });
    })();
  }, [type, bookId]);

  useEffect(() => {
    if (!showVat && vatRate !== 0) {
      setVatRate(0);
    }
  }, [showVat, vatRate]);

  useEffect(() => {
    return () => {
      if (receiptDraft?.previewUrl) {
        URL.revokeObjectURL(receiptDraft.previewUrl);
      }
    };
  }, [receiptDraft?.previewUrl]);

  async function handlePickReceipt() {
    setFormError("");

    try {
      const draft = await pickReceiptPhoto();
      if (!draft) return;

      setReceiptDraft(draft);
      setReceiptRemoved(false);
    } catch (err) {
      console.error("Failed to select receipt photo:", err);
      setFormError("Δεν φορτώθηκε η φωτογραφία απόδειξης. Δοκίμασε άλλη εικόνα.");
    }
  }

  function handleRemoveReceipt() {
    setReceiptDraft(null);
    setReceiptRemoved(true);
  }

  async function handleSubmit() {
    if (submitting) return;
    setFormError("");
    setAmountError("");

    const grossNum = parseGreekAmount(amount);
    if (grossNum === null || grossNum <= 0) {
      setAmountError("Μη έγκυρο ποσό. Παράδειγμα: 1.234,56");
      return;
    }

    if (!accountId || !categoryId) {
      setFormError("Συμπλήρωσε κατηγορία και λογαριασμό.");
      return;
    }

    setSubmitting(true);
    try {
      const tag = await findOrCreateTag(tagName);
      const fallbackDescription =
        categories.find((category) => category.id === categoryId)?.name ?? "Χωρίς περιγραφή";
      await onSubmit({
        date,
        description: description.trim() || fallbackDescription,
        book_id: bookId,
        account_id: accountId,
        category_id: categoryId,
        tag_id: tag?.id ?? null,
        payment_method: paymentMethod,
        amount_gross: grossNum,
        vat_rate: vatRate,
        receipt_photo_bytes: receiptDraft?.bytes ?? null,
        remove_receipt_photo: receiptRemoved,
        notes: notes.trim() || null,
      });
    } catch (err) {
      console.error("Failed to save transaction:", err);
      setFormError("Δεν αποθηκεύτηκε η συναλλαγή. Δοκίμασε ξανά.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-4 pb-6 space-y-4">
        <div>
          <div className="form-label">Βιβλίο</div>
          <div className="grid grid-cols-2 bg-sand p-0.5 rounded-md border border-border-light">
            {BOOK_OPTIONS.map((book) => (
              <button
                key={book.value}
                type="button"
                onClick={() => setBookId(book.value)}
                className={`text-sm py-2 px-3 rounded-md transition-all ${
                  bookId === book.value
                    ? "bg-cream text-text-primary shadow-sm font-medium"
                    : "text-text-secondary"
                }`}
              >
                {book.label}
              </button>
            ))}
          </div>
          {!showVat ? <p className="text-caption mt-1">Στα προσωπικά δεν τηρείται ΦΠΑ.</p> : null}
        </div>

        <div>
          <label className="form-label" htmlFor="tx-amount">
            Ποσό
          </label>
          <input
            id="tx-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setAmountError("");
            }}
            placeholder="0,00 €"
            autoFocus={autoFocusAmount}
            className={`w-full bg-cream border rounded-md text-[32px] font-bold tracking-tight tabular-nums px-3.5 py-4 focus:outline-none transition-colors ${
              amountError
                ? "border-expense focus:border-expense"
                : "border-border-light focus:border-charcoal"
            }`}
          />
          {amountError ? (
            <p className="mt-1.5 text-sm text-expense" role="alert">
              {amountError}
            </p>
          ) : null}
        </div>

        <div>
          <div className="form-label">Είδος</div>
          <div className="grid grid-cols-3 bg-sand p-0.5 rounded-md border border-border-light">
            {(["income", "expense", "reserve"] as TxType[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                className={`text-sm py-2 px-3 rounded-md transition-all ${
                  type === item
                    ? "bg-cream text-text-primary shadow-sm font-medium"
                    : "text-text-secondary"
                }`}
              >
                {item === "income" ? "Έσοδο" : item === "expense" ? "Έξοδο" : "Άλλο"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="tx-description">
            Περιγραφή (προαιρετικό)
          </label>
          <input
            id="tx-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="π.χ. Ψώνια λαχαναγορά"
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="tx-category">
              Κατηγορία
            </label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="tx-category" className="bg-cream border-border-light">
                <SelectValue placeholder="— Επίλεξε —" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label" htmlFor="tx-account">
              Λογαριασμός
            </label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="tx-account" className="bg-cream border-border-light">
                <SelectValue placeholder="— Επίλεξε —" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {displayAccountName(account.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="tx-date">
            Ημερομηνία
          </label>
          <input
            id="tx-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
          />
          <p className="text-caption mt-1">{formatDateRelative(date)}</p>
        </div>

        {showVat ? (
          <div>
            <div className="form-label">{vatLabel}</div>
            <div className="flex gap-1.5">
              {VAT_RATES.map((vat) => (
                <button
                  key={vat.value}
                  type="button"
                  onClick={() => setVatRate(vat.value)}
                  className={`flex-1 chip py-2 justify-center ${vatRate === vat.value ? "active" : ""}`}
                >
                  {vat.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <label className="form-label" htmlFor="tx-payment-method">
            Τρόπος Πληρωμής
          </label>
          <Select
            value={paymentMethod}
            onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
          >
            <SelectTrigger id="tx-payment-method" className="bg-cream border-border-light">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="form-label" htmlFor="tx-tag">
            Tag (προαιρετικό)
          </label>
          <input
            id="tx-tag"
            type="text"
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            placeholder="π.χ. Cold Kitchen Project"
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handlePickReceipt}
            disabled={submitting}
            className="w-full flex items-center gap-2.5 bg-cream border border-border-mid text-charcoal rounded-md py-2.5 px-3.5 text-sm font-medium hover:bg-sand disabled:opacity-50 transition-colors"
          >
            <Camera className="w-[18px] h-[18px]" strokeWidth={1.5} />
            {receiptPreviewUrl ? "Αλλαγή φωτογραφίας απόδειξης" : "Φωτογραφία απόδειξης"}
          </button>

          {receiptPreviewUrl ? (
            <div className="relative overflow-hidden rounded-md border border-border-light bg-sand">
              <img src={receiptPreviewUrl} alt="" className="h-36 w-full object-cover" />
              <button
                type="button"
                onClick={handleRemoveReceipt}
                disabled={submitting}
                aria-label="Αφαίρεση απόδειξης"
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-charcoal text-text-on-dark disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
          ) : null}

          {receiptRemoved && defaults.receiptPhotoPath ? (
            <p className="text-caption text-text-muted">Η υπάρχουσα απόδειξη θα αφαιρεθεί.</p>
          ) : null}
        </div>

        <div>
          <label className="form-label" htmlFor="tx-notes">
            Σημειώσεις (προαιρετικό)
          </label>
          <textarea
            id="tx-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal resize-none transition-colors"
          />
        </div>

        {formError ? (
          <p className="text-sm text-expense" role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 p-4 bg-cream border-t border-border-light">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-charcoal text-text-on-dark rounded-md py-3.5 text-[15px] font-medium hover:bg-charcoal-soft disabled:opacity-50 transition-colors"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </>
  );
}
