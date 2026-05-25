import { useTier } from "@/hooks/useTier";
import { openBillingPortal, openUpgradeUrl } from "@/lib/upgrade";
import { formatDateRelative } from "@/lib/utils";
import { CreditCard, RefreshCcw, Star } from "lucide-react";

/**
 * Subscription management section inside Settings.
 * Shows current tier, upgrade/manage options.
 */
export function SubscriptionSection() {
  const { subscription, displayName, isPro, hasWarning, loading, refresh } = useTier();

  return (
    <section className="rounded-md border border-border-light bg-cream p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h3">Συνδρομή</h2>
          <p className="mt-1 text-caption">Διαχείριση πλάνου και χρέωσης.</p>
        </div>
        <CreditCard className="h-5 w-5 text-gold" strokeWidth={1.7} />
      </div>

      {/* Current plan card */}
      <div
        className={`rounded-md border p-4 ${
          isPro ? "border-gold bg-gold/5" : "border-border-light bg-sand/40"
        }`}
      >
        <div className="flex items-center gap-2">
          {isPro && <Star className="h-4 w-4 text-gold" strokeWidth={1.7} />}
          <span className="text-h3">{displayName}</span>
          {isPro && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-semibold text-gold">
              Ενεργό
            </span>
          )}
          {hasWarning && (
            <span className="rounded-full bg-expense/10 px-2 py-0.5 text-[11px] font-semibold text-expense">
              {subscription.status === "past_due" ? "Ληξιπρόθεσμη πληρωμή" : "Ακυρώνεται"}
            </span>
          )}
        </div>

        {subscription.currentPeriodEnd && isPro && (
          <p className="mt-2 text-caption text-text-muted">
            {subscription.cancelAtPeriodEnd ? "Λήγει" : "Ανανεώνεται"}:{" "}
            {formatDateRelative(subscription.currentPeriodEnd)}
          </p>
        )}

        {!isPro && (
          <p className="mt-2 text-body-sm text-text-secondary">
            1 βιβλίο, 50 καταχωρήσεις/μήνα, χωρίς sync.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        {isPro ? (
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-medium text-charcoal hover:bg-sand disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" strokeWidth={1.7} />
            Διαχείριση συνδρομής
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void openUpgradeUrl("monthly")}
              className="inline-flex items-center gap-2 rounded-md bg-charcoal px-4 py-2.5 text-sm font-semibold text-cream"
            >
              <Star className="h-4 w-4" strokeWidth={1.7} />
              Αναβάθμιση σε Solo — 6,90€/μήνα
            </button>
            <button
              type="button"
              onClick={() => void openUpgradeUrl("annual")}
              className="inline-flex items-center gap-2 rounded-md border border-border-light px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-sand"
            >
              69€/έτος (εξοικονόμηση 17%)
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:underline disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.7} />
          Ανανέωση κατάστασης
        </button>
      </div>

      {/* Pro features summary */}
      {!isPro && (
        <div className="mt-4 rounded-md border border-gold/15 bg-gold/5 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase text-gold">
            Τι περιλαμβάνει το Solo
          </p>
          <ul className="grid gap-1.5 text-body-sm text-text-secondary sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Check />
              Απεριόριστα βιβλία & καταχωρήσεις
            </li>
            <li className="flex items-center gap-2">
              <Check />
              Cloud sync σε όλες τις συσκευές
            </li>
            <li className="flex items-center gap-2">
              <Check />
              Αποδείξεις & φωτογραφίες
            </li>
            <li className="flex items-center gap-2">
              <Check />
              Excel export για λογιστή
            </li>
            <li className="flex items-center gap-2">
              <Check />
              Backup σε Google Drive
            </li>
            <li className="flex items-center gap-2">
              <Check />
              Priority support
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8860B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
