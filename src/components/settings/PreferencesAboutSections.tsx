import { isTauri } from "@tauri-apps/api/core";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { ExternalLink, Info, RefreshCcw, Settings2, ShieldAlert } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTier } from "@/hooks/useTier";
import type { PaymentMethod } from "@/lib/types";

type Option<T extends string | number> = { label: string; value: T };

const RELEASES_URL = "https://github.com/heraklist/Rheo_Finance/releases/latest";

function sectionClassName(extra = ""): string {
  return `bg-cream border border-border-light rounded-md p-4 ${extra}`;
}

async function openReleasesPage(): Promise<void> {
  if (isTauri()) {
    try {
      await openExternal(RELEASES_URL);
      return;
    } catch (error) {
      console.error("Failed to open releases page with shell plugin:", error);
    }
  }

  window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
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
  defaultVatRate,
  defaultPaymentMethod,
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
  updateMessage: string;
  onUpdateCheck: () => void;
}

export function AboutSection({
  appVersion,
  checkingUpdate,
  updateMessage,
  onUpdateCheck,
}: AboutSectionProps) {
  const { displayName, loading } = useTier();

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
          onClick={() => void openReleasesPage()}
          className="inline-flex items-center gap-2 text-gold font-medium hover:underline"
        >
          <ExternalLink className="w-4 h-4" strokeWidth={1.7} />
          GitHub Releases
        </button>
        <div className="flex items-start gap-2 text-text-muted">
          <ShieldAlert className="w-4 h-4 mt-0.5 text-gold" strokeWidth={1.7} />
          <p>Πλάνο: {loading ? "Έλεγχος..." : displayName}.</p>
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
