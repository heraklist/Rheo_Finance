import { CreditCard, RefreshCcw, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useTier } from "@/hooks/useTier";
import { getUsageCounts, type UsageCounts } from "@/lib/analytics";
import type { SubscriptionTier } from "@/lib/subscription";
import { openBillingPortal, openUpgradeUrl } from "@/lib/upgrade";
import { cn, formatDateRelative } from "@/lib/utils";

// === Tier data ===

interface TierInfo {
  name: string;
  monthly: string;
  annual: string;
  note: string;
  key: SubscriptionTier;
}

const TIERS: TierInfo[] = [
  { key: "free", name: "Free", monthly: "€0", annual: "€0", note: "Βασική οργάνωση" },
  { key: "solo", name: "Solo", monthly: "€6,90", annual: "€69", note: "Για προσωπικό cashflow" },
  { key: "pro", name: "Pro", monthly: "€12,90", annual: "€129", note: "Για προχωρημένα σενάρια" },
  { key: "team", name: "Team", monthly: "€29", annual: "€290", note: "Phase 2" },
];

const COMPARISON_ROWS: Array<[string, string, string, string, string]> = [
  ["Βασική οργάνωση", "✓", "✓", "✓", "✓"],
  ["Plan Hub", "Περιορισμένο", "✓", "✓", "✓"],
  ["Σχεδιασμός σεναρίων", "—", "—", "✓", "✓"],
  ["Εξαγωγές", "1", "10", "Απεριόριστες", "Απεριόριστες"],
  ["Ομαδική χρήση", "—", "—", "—", "Phase 2"],
];

// === Sub-components ===

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}): React.JSX.Element {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const tone = pct > 80 ? "text-expense" : "text-gold";

  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-[11px] text-text-muted">
        <span>{label}</span>
        <span>
          {used}/{max}
        </span>
      </div>
      <progress className={cn("progress-meter h-1.5", tone)} value={pct} max={100} />
    </div>
  );
}

function BillingToggle({
  cycle,
  onToggle,
}: {
  cycle: "monthly" | "annual";
  onToggle: (cycle: "monthly" | "annual") => void;
}): React.JSX.Element {
  return (
    <div className="flex w-fit rounded-md border border-border-light bg-sand p-1">
      <button
        type="button"
        onClick={() => onToggle("monthly")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          cycle === "monthly" ? "bg-cream font-medium text-text-primary" : "text-text-secondary",
        )}
      >
        Μηνιαία
      </button>
      <button
        type="button"
        onClick={() => onToggle("annual")}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          cycle === "annual" ? "bg-cream font-medium text-text-primary" : "text-text-secondary",
        )}
      >
        Ετήσια
      </button>
    </div>
  );
}

// === Main component ===

/**
 * Subscription v2 — comparison table, usage meters, billing toggle.
 */
export function SubscriptionSection(): React.JSX.Element {
  const { subscription, tier, isPro, hasWarning, loading, refresh } = useTier();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [usage, setUsage] = useState<UsageCounts>({
    activePlans: 0,
    exportsThisMonth: 0,
    books: 0,
  });

  useEffect(() => {
    void getUsageCounts().then(setUsage);
  }, []);

  return (
    <section className="rounded-md border border-border-light bg-cream p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h3">Συνδρομή & Χρέωση</h2>
          <p className="mt-1 text-caption text-text-muted">
            Διαχείριση πλάνου, χρέωσης και χρήσης.
          </p>
        </div>
        <CreditCard className="h-5 w-5 text-gold" strokeWidth={1.7} />
      </div>

      {/* Billing cycle toggle */}
      <BillingToggle cycle={billingCycle} onToggle={setBillingCycle} />

      {/* Tier cards */}
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {TIERS.map((t) => {
          const isCurrent = t.key === tier;
          return (
            <div
              key={t.key}
              className={cn(
                "rounded-md border p-4",
                isCurrent ? "border-gold bg-gold/5" : "border-border-light bg-sand/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-text-primary">{t.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
                    Τρέχον
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-text-primary">
                {billingCycle === "monthly" ? t.monthly : t.annual}
                <span className="text-sm font-normal text-text-secondary">
                  {" "}
                  / {billingCycle === "monthly" ? "μήνα" : "έτος"}
                </span>
              </p>
              <p className="mt-1 text-sm text-text-secondary">{t.note}</p>
              {!isCurrent && t.key !== "team" && t.key !== "free" && (
                <button
                  type="button"
                  onClick={() =>
                    void openUpgradeUrl(billingCycle === "monthly" ? "monthly" : "annual")
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-charcoal px-3 py-1.5 text-xs font-semibold text-cream"
                >
                  <Star className="h-3.5 w-3.5" strokeWidth={1.7} />
                  Αναβάθμιση
                </button>
              )}
              {t.key === "team" && (
                <p className="mt-3 text-[11px] font-medium text-text-muted">Phase 2</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Current plan status */}
      {isPro && subscription.currentPeriodEnd && (
        <div className="mt-4 rounded-md border border-border-light bg-sand/40 p-3">
          <p className="text-sm text-text-secondary">
            {subscription.cancelAtPeriodEnd ? "Λήγει" : "Ανανεώνεται"}:{" "}
            {formatDateRelative(subscription.currentPeriodEnd)}
          </p>
          {hasWarning && (
            <p className="mt-1 text-sm font-medium text-expense">
              {subscription.status === "past_due"
                ? "Ληξιπρόθεσμη πληρωμή"
                : "Ακυρώνεται στο τέλος της περιόδου"}
            </p>
          )}
        </div>
      )}

      {/* Usage meters */}
      <div className="mt-4 rounded-md border border-border-light bg-sand/40 p-4">
        <h3 className="mb-3 font-semibold text-text-primary">Χρήση πλάνου</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <UsageMeter
            label="Ενεργά πλάνα"
            used={usage.activePlans}
            max={tier === "free" ? 2 : 999}
          />
          <UsageMeter
            label="Εξαγωγές μήνα"
            used={usage.exportsThisMonth}
            max={tier === "free" ? 1 : tier === "solo" ? 10 : 999}
          />
          <UsageMeter label="Λογαριασμοί" used={usage.books} max={tier === "free" ? 1 : 999} />
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="mt-4 overflow-x-auto rounded-md border border-border-light">
        <table className="w-full min-w-[600px] border-collapse bg-cream text-sm">
          <thead className="bg-sand text-left text-text-secondary">
            <tr>
              {["Δυνατότητα", "Free", "Solo", "Pro", "Team"].map((h) => (
                <th key={h} className="p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row[0]} className="border-t border-border-light">
                {row.map((cell, i) => (
                  <td key={`${row[0]}-${i}`} className="p-3 text-text-primary">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        {isPro && (
          <button
            type="button"
            onClick={() => void openBillingPortal()}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-medium text-charcoal hover:bg-sand disabled:opacity-50"
          >
            <CreditCard className="h-4 w-4" strokeWidth={1.7} />
            Διαχείριση συνδρομής
          </button>
        )}
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:underline disabled:opacity-50"
        >
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} strokeWidth={1.7} />
          Ανανέωση κατάστασης
        </button>
      </div>

      {/* Pro features for free users */}
      {!isPro && (
        <div className="mt-4 rounded-md border border-gold/15 bg-gold/5 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase text-gold">Ξεκλείδωμα με Solo</p>
          <p className="text-body-sm text-text-secondary">
            Απεριόριστα βιβλία, sync, αποδείξεις και Excel export.
          </p>
        </div>
      )}
    </section>
  );
}
