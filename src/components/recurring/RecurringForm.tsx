import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseGreekAmount } from "@/lib/money";
import { findOrCreateTag, listAccounts, listCategories } from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import type { Account, Category, CategoryType, Frequency } from "@/lib/types";
import { formatDateRelative } from "@/lib/utils";
import { CalendarClock, Check, Pause } from "lucide-react";
import { useEffect, useState } from "react";

const VAT_RATES = [
  { label: "24%", value: 0.24 },
  { label: "13%", value: 0.13 },
  { label: "6%", value: 0.06 },
  { label: "0%", value: 0 },
];

const FREQUENCIES: Array<{ label: string; value: Frequency }> = [
  { label: "Μήνα", value: "monthly" },
  { label: "Εβδομάδα", value: "weekly" },
  { label: "Τρίμηνο", value: "quarterly" },
  { label: "Έτος", value: "yearly" },
];

const WEEKDAYS = [
  { label: "Δευτέρα", value: 1 },
  { label: "Τρίτη", value: 2 },
  { label: "Τετάρτη", value: 3 },
  { label: "Πέμπτη", value: 4 },
  { label: "Παρασκευή", value: 5 },
  { label: "Σάββατο", value: 6 },
  { label: "Κυριακή", value: 7 },
];

type RecurringType = Extract<CategoryType, "income" | "expense" | "reserve">;

export interface RecurringFormValues {
  active: boolean;
  description: string;
  book_id: string;
  account_id: string;
  category_id: string;
  tag_id?: string | null;
  amount_gross: number;
  vat_rate: number;
  frequency: Frequency;
  day_of_period: number;
  start_date: string;
  end_date?: string | null;
}

export interface RecurringFormInitialValues {
  active: boolean;
  amount: string;
  type: RecurringType;
  description: string;
  accountId: string;
  categoryId: string;
  vatRate: number;
  frequency: Frequency;
  dayOfPeriod: number;
  startDate: string;
  endDate: string;
  tagName: string;
}

interface RecurringFormProps {
  initialValues?: RecurringFormInitialValues;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (values: RecurringFormValues) => Promise<void>;
  onCancel: () => void;
}

function defaultValues(vatRate: number): RecurringFormInitialValues {
  return {
    active: true,
    amount: "",
    type: "expense",
    description: "",
    accountId: "",
    categoryId: "",
    vatRate,
    frequency: "monthly",
    dayOfPeriod: new Date().getDate(),
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    tagName: "",
  };
}

function clampDay(value: number): number {
  return Math.min(Math.max(Math.round(value), 1), 31);
}

export function RecurringForm({
  initialValues,
  submitLabel,
  submittingLabel,
  onSubmit,
  onCancel,
}: RecurringFormProps) {
  const currentBookId = useAppStore((state) => state.currentBookId);
  const defaultVatRate = useAppStore((state) => state.defaultVatRate);
  const defaults =
    initialValues ?? defaultValues(currentBookId === "book-business" ? defaultVatRate : 0);
  const [submitting, setSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [active, setActive] = useState(defaults.active);
  const [type, setType] = useState<RecurringType>(defaults.type);
  const [amount, setAmount] = useState(defaults.amount);
  const [description, setDescription] = useState(defaults.description);
  const [accountId, setAccountId] = useState(defaults.accountId);
  const [categoryId, setCategoryId] = useState(defaults.categoryId);
  const [vatRate, setVatRate] = useState(defaults.vatRate);
  const [frequency, setFrequency] = useState<Frequency>(defaults.frequency);
  const [dayOfPeriod, setDayOfPeriod] = useState(defaults.dayOfPeriod);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [tagName, setTagName] = useState(defaults.tagName);
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");
  const showVat = currentBookId === "book-business";
  const vatLabel = type === "income" ? "ΦΠΑ (εκροών)" : "ΦΠΑ (εισροών)";

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      const rows = await listAccounts(currentBookId);
      if (cancelled) return;
      setAccounts(rows);
      setAccountId((current) => current || rows[0]?.id || "");
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [currentBookId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      const rows = await listCategories({ bookId: currentBookId, type });
      if (cancelled) return;

      setCategories(rows);
      setCategoryId((current) => {
        if (current && rows.some((category) => category.id === current)) return current;
        return rows[0]?.id || "";
      });
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [currentBookId, type]);

  useEffect(() => {
    if (!showVat && vatRate !== 0) {
      setVatRate(0);
    }
  }, [showVat, vatRate]);

  async function handleSubmit() {
    if (submitting) return;
    setFormError("");
    setAmountError("");

    const grossNum = parseGreekAmount(amount);
    if (grossNum === null || grossNum <= 0) {
      setAmountError("Μη έγκυρο ποσό. Παράδειγμα: 1.234,56");
      return;
    }

    if (!description.trim() || !accountId || !categoryId) {
      setFormError("Συμπλήρωσε περιγραφή, κατηγορία και λογαριασμό.");
      return;
    }

    if (endDate && endDate < startDate) {
      setFormError("Η ημερομηνία λήξης πρέπει να είναι μετά την έναρξη.");
      return;
    }

    setSubmitting(true);
    try {
      const tag = await findOrCreateTag(tagName);
      await onSubmit({
        active,
        description: description.trim(),
        book_id: currentBookId,
        account_id: accountId,
        category_id: categoryId,
        tag_id: tag?.id ?? null,
        amount_gross: grossNum,
        vat_rate: vatRate,
        frequency,
        day_of_period: frequency === "weekly" ? dayOfPeriod : clampDay(dayOfPeriod),
        start_date: startDate,
        end_date: endDate || null,
      });
    } catch (err) {
      console.error("Failed to save recurring template:", err);
      setFormError("Δεν αποθηκεύτηκε το πάγιο. Δοκίμασε ξανά.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-4 pb-6 space-y-4">
        <div className="flex items-center justify-between rounded-md border border-border-light bg-cream p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-light bg-sand text-gold">
              <CalendarClock className="h-4 w-4" strokeWidth={1.7} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Κατάσταση</p>
              <p className="text-caption">{active ? "Ενεργό" : "Σε παύση"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActive((current) => !current)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${
              active
                ? "bg-income-light text-income"
                : "bg-sand text-text-secondary border border-border-light"
            }`}
            aria-pressed={active}
          >
            {active ? <Check className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {active ? "On" : "Off"}
          </button>
        </div>

        <div>
          <label className="form-label" htmlFor="rec-description">
            Περιγραφή
          </label>
          <input
            id="rec-description"
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="π.χ. ΔΕΗ μηνιαία"
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        <div>
          <label className="form-label" htmlFor="rec-amount">
            Ποσό
          </label>
          <input
            id="rec-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setAmountError("");
            }}
            placeholder="0,00 €"
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
            {(["income", "expense", "reserve"] as RecurringType[]).map((item) => (
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="rec-category">
              Κατηγορία
            </label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="rec-category" className="bg-cream border-border-light">
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
            <label className="form-label" htmlFor="rec-account">
              Λογαριασμός
            </label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="rec-account" className="bg-cream border-border-light">
                <SelectValue placeholder="— Επίλεξε —" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <div className="form-label">Συχνότητα</div>
          <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
            {FREQUENCIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFrequency(item.value)}
                className={`chip justify-center py-2 ${frequency === item.value ? "active" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label" htmlFor="rec-start-date">
              Έναρξη
            </label>
            <input
              id="rec-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
            />
            <p className="text-caption mt-1">{formatDateRelative(startDate)}</p>
          </div>
          <div>
            <label className="form-label" htmlFor="rec-end-date">
              Λήξη
            </label>
            <input
              id="rec-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
            />
            <p className="text-caption mt-1">Προαιρετικό</p>
          </div>
        </div>

        <div>
          {frequency === "weekly" ? (
            <>
              <label className="form-label" htmlFor="rec-weekday">
                Ημέρα εβδομάδας
              </label>
              <Select
                value={String(dayOfPeriod)}
                onValueChange={(value) => setDayOfPeriod(Number(value))}
              >
                <SelectTrigger id="rec-weekday" className="bg-cream border-border-light">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <label className="form-label" htmlFor="rec-day">
                Ημέρα περιόδου
              </label>
              <input
                id="rec-day"
                type="number"
                min={1}
                max={31}
                value={dayOfPeriod}
                onChange={(event) => setDayOfPeriod(Number(event.target.value))}
                className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
              />
            </>
          )}
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
          <label className="form-label" htmlFor="rec-tag">
            Tag (προαιρετικό)
          </label>
          <input
            id="rec-tag"
            type="text"
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            placeholder="π.χ. Πάγια"
            className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal transition-colors"
          />
        </div>

        {formError ? (
          <p className="text-sm text-expense" role="alert">
            {formError}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 grid grid-cols-[1fr_1.5fr] gap-2 p-4 bg-cream border-t border-border-light">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-border-light py-3.5 text-[15px] font-medium text-text-secondary hover:bg-sand disabled:opacity-50 transition-colors"
        >
          Ακύρωση
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-charcoal text-text-on-dark rounded-md py-3.5 text-[15px] font-medium hover:bg-charcoal-soft disabled:opacity-50 transition-colors"
        >
          {submitting ? submittingLabel : submitLabel}
        </button>
      </div>
    </div>
  );
}
