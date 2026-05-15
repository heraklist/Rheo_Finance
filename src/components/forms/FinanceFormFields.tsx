import { formatDateRelative } from "@/lib/utils";

export type EntryType = "income" | "expense" | "reserve";

const BOOK_OPTIONS = [
  { label: "Επαγγελματικά", value: "book-business" },
  { label: "Προσωπικά", value: "book-personal" },
];

const TYPE_OPTIONS: Array<{ label: string; value: EntryType }> = [
  { label: "Έσοδο", value: "income" },
  { label: "Έξοδο", value: "expense" },
  { label: "Άλλο", value: "reserve" },
];

const VAT_RATES = [
  { label: "24%", value: 0.24 },
  { label: "13%", value: 0.13 },
  { label: "6%", value: 0.06 },
  { label: "0%", value: 0 },
];

interface BookSelectorProps {
  bookId: string;
  showVat: boolean;
  onBookIdChange: (value: string) => void;
}

export function BookSelector({ bookId, showVat, onBookIdChange }: BookSelectorProps) {
  return (
    <div>
      <div className="form-label">Βιβλίο</div>
      <div className="grid grid-cols-2 bg-sand p-0.5 rounded-md border border-border-light">
        {BOOK_OPTIONS.map((book) => (
          <button
            key={book.value}
            type="button"
            onClick={() => onBookIdChange(book.value)}
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
  );
}

interface MoneyAmountFieldProps {
  autoFocus?: boolean;
  error: string;
  id: string;
  value: string;
  onErrorClear: () => void;
  onValueChange: (value: string) => void;
}

export function MoneyAmountField({
  autoFocus = false,
  error,
  id,
  value,
  onErrorClear,
  onValueChange,
}: MoneyAmountFieldProps) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        Ποσό
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          onErrorClear();
        }}
        placeholder="0,00 €"
        autoFocus={autoFocus}
        className={`w-full bg-cream border rounded-md text-[32px] font-bold tracking-tight tabular-nums px-3.5 py-4 focus:outline-none transition-colors ${
          error
            ? "border-expense focus:border-expense"
            : "border-border-light focus:border-charcoal"
        }`}
      />
      {error ? (
        <p className="mt-1.5 text-sm text-expense" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface EntryTypeSelectorProps<T extends EntryType> {
  value: T;
  onChange: (value: T) => void;
}

export function EntryTypeSelector<T extends EntryType>({
  value,
  onChange,
}: EntryTypeSelectorProps<T>) {
  return (
    <div>
      <div className="form-label">Είδος</div>
      <div className="grid grid-cols-3 bg-sand p-0.5 rounded-md border border-border-light">
        {TYPE_OPTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value as T)}
            className={`text-sm py-2 px-3 rounded-md transition-all ${
              value === item.value
                ? "bg-cream text-text-primary shadow-sm font-medium"
                : "text-text-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  caption?: string;
  onChange: (value: string) => void;
}

export function DateField({ id, label, value, caption, onChange }: DateFieldProps) {
  return (
    <div>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
      />
      <p className="text-caption mt-1">{caption ?? formatDateRelative(value)}</p>
    </div>
  );
}

interface VatRateSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function VatRateSelector({ label, value, onChange }: VatRateSelectorProps) {
  return (
    <div>
      <div className="form-label">{label}</div>
      <div className="flex gap-1.5">
        {VAT_RATES.map((vat) => (
          <button
            key={vat.value}
            type="button"
            onClick={() => onChange(vat.value)}
            className={`flex-1 chip py-2 justify-center ${value === vat.value ? "active" : ""}`}
          >
            {vat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
