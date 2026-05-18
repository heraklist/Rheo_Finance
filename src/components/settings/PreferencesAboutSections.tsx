import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentMethod } from "@/lib/types";
import {
  ExternalLink,
  Info,
  KeyRound,
  RefreshCcw,
  Save,
  Settings2,
  ShieldAlert,
  X,
} from "lucide-react";

type Option<T extends string | number> = { label: string; value: T };

function sectionClassName(extra = ""): string {
  return `bg-cream border border-border-light rounded-md p-4 ${extra}`;
}

interface PreferencesSectionProps {
  bookOptions: Array<Option<string>>;
  currentBookId: string;
  defaultPaymentMethod: PaymentMethod;
  defaultVatRate: number;
  paymentMethods: PaymentMethod[];
  vatRates: Array<Option<number>>;
  onCurrentBookIdChange: (value: string) => void;
  onDefaultPaymentMethodChange: (value: PaymentMethod) => void;
  onDefaultVatRateChange: (value: number) => void;
}

export function PreferencesSection({
  bookOptions,
  currentBookId,
  defaultPaymentMethod,
  defaultVatRate,
  paymentMethods,
  vatRates,
  onCurrentBookIdChange,
  onDefaultPaymentMethodChange,
  onDefaultVatRateChange,
}: PreferencesSectionProps) {
  return (
    <section className={sectionClassName()}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-h3">Προτιμήσεις</h2>
          <p className="text-caption mt-1">Defaults για νέες καταχωρήσεις.</p>
        </div>
        <Settings2 className="w-5 h-5 text-gold" strokeWidth={1.7} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="form-label" htmlFor="pref-vat">
            Default ΦΠΑ
          </label>
          <Select
            value={String(defaultVatRate)}
            onValueChange={(value) => onDefaultVatRateChange(Number(value))}
          >
            <SelectTrigger id="pref-vat" className="bg-cream border-border-light">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vatRates.map((vat) => (
                <SelectItem key={vat.value} value={String(vat.value)}>
                  {vat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="form-label" htmlFor="pref-book">
            Default book
          </label>
          <Select value={currentBookId} onValueChange={onCurrentBookIdChange}>
            <SelectTrigger id="pref-book" className="bg-cream border-border-light">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bookOptions.map((book) => (
                <SelectItem key={book.value} value={book.value}>
                  {book.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="form-label" htmlFor="pref-payment">
            Default πληρωμή
          </label>
          <Select
            value={defaultPaymentMethod}
            onValueChange={(value) => onDefaultPaymentMethodChange(value as PaymentMethod)}
          >
            <SelectTrigger id="pref-payment" className="bg-cream border-border-light">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-caption mt-3">Νόμισμα: EUR. Άλλα νομίσματα θα μπουν σε μελλοντική φάση.</p>
    </section>
  );
}

interface AboutSectionProps {
  appVersion: string;
  checkingUpdate: boolean;
  githubTokenDraft: string;
  githubTokenMessage: string;
  githubTokenSaved: boolean;
  savingGithubToken: boolean;
  updateMessage: string;
  onClearGithubToken: () => void;
  onGithubTokenDraftChange: (value: string) => void;
  onSaveGithubToken: () => void;
  onUpdateCheck: () => void;
}

export function AboutSection({
  appVersion,
  checkingUpdate,
  githubTokenDraft,
  githubTokenMessage,
  githubTokenSaved,
  savingGithubToken,
  updateMessage,
  onClearGithubToken,
  onGithubTokenDraftChange,
  onSaveGithubToken,
  onUpdateCheck,
}: AboutSectionProps) {
  return (
    <section className={sectionClassName("mb-8")}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-h3">Σχετικά</h2>
          <p className="text-caption mt-1">Rheo Finance v{appVersion}</p>
        </div>
        <Info className="w-5 h-5 text-gold" strokeWidth={1.7} />
      </div>
      <div className="space-y-3 text-sm">
        <button
          type="button"
          onClick={() =>
            window.open("https://github.com/heraklist/Rheo_Finance/releases/latest", "_blank")
          }
          className="inline-flex items-center gap-2 text-gold font-medium hover:underline"
        >
          <ExternalLink className="w-4 h-4" strokeWidth={1.7} />
          GitHub Releases
        </button>
        <div className="flex items-start gap-2 text-text-muted">
          <ShieldAlert className="w-4 h-4 mt-0.5 text-gold" strokeWidth={1.7} />
          <p>Άδεια: ιδιωτική χρήση Heraklis.</p>
        </div>
        <div className="rounded-md border border-border-light bg-sand p-3">
          <div className="mb-3 flex items-start gap-2 text-text-muted">
            <KeyRound className="mt-0.5 h-4 w-4 text-gold" strokeWidth={1.7} />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Ενημερώσεις από GitHub Releases
              </p>
              <p className="text-caption">
                {githubTokenSaved
                  ? "Υπάρχει αποθηκευμένο token για πρόσβαση στο private release feed."
                  : "Το repo είναι private. Χρειάζεται token με read access για έλεγχο ενημερώσεων."}
              </p>
              <p className="text-caption mt-1">
                Desktop: αυτόματη signed εγκατάσταση. Android: ανοίγει το τελευταίο APK για
                sideload.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={githubTokenDraft}
              onChange={(event) => onGithubTokenDraftChange(event.target.value)}
              placeholder="GitHub token"
              className="min-w-0 flex-1 rounded-md border border-border-light bg-cream px-3 py-2 text-sm focus:border-charcoal focus:outline-none"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onSaveGithubToken}
              disabled={savingGithubToken}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-text-on-dark disabled:opacity-50"
            >
              <Save className="h-4 w-4" strokeWidth={1.7} />
              Αποθήκευση
            </button>
            {githubTokenSaved ? (
              <button
                type="button"
                onClick={onClearGithubToken}
                disabled={savingGithubToken}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium text-expense hover:underline disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
                Διαγραφή
              </button>
            ) : null}
          </div>
          {githubTokenMessage ? (
            <p className="mt-2 text-caption text-text-muted">{githubTokenMessage}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onUpdateCheck}
          disabled={checkingUpdate}
          className="inline-flex items-center gap-2 text-text-secondary font-medium hover:underline disabled:opacity-50"
        >
          <RefreshCcw
            className={`w-4 h-4 ${checkingUpdate ? "animate-spin" : ""}`}
            strokeWidth={1.7}
          />
          {checkingUpdate ? "Έλεγχος..." : "Έλεγχος ενημερώσεων"}
        </button>
        {updateMessage ? <p className="text-caption text-text-muted">{updateMessage}</p> : null}
      </div>
    </section>
  );
}
