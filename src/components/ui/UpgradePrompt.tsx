import { featureUpgradeMessage, type GatedFeature } from "@/lib/subscription";
import { openUpgradeUrl } from "@/lib/upgrade";
import { cn } from "@/lib/utils";

interface UpgradePromptProps {
  feature: GatedFeature;
  /** Inline = sand card inside page, block = full replacement */
  variant?: "inline" | "block";
  className?: string;
}

/**
 * Upgrade prompt for tier-gated features.
 * Matches Rheo design: sand background, gold accent, no heavy shadows.
 *
 * Usage:
 * ```tsx
 * if (!hasFeature("sync")) {
 *   return <UpgradePrompt feature="sync" />;
 * }
 * ```
 */
export function UpgradePrompt({ feature, variant = "inline", className }: UpgradePromptProps) {
  const message = featureUpgradeMessage(feature);

  if (variant === "block") {
    return (
      <div
        className={cn(
          "flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-border-light bg-sand/60 p-8 text-center",
          className,
        )}
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gold"
          >
            <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" />
          </svg>
        </div>
        <p className="text-body font-medium text-charcoal">{message}</p>
        <button
          type="button"
          onClick={() => void openUpgradeUrl()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-charcoal px-5 py-2.5 text-[13px] font-semibold text-cream transition-colors hover:bg-charcoal-soft"
        >
          Αναβάθμιση σε Pro
        </button>
      </div>
    );
  }

  // Inline variant: sand card with gold left border
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-gold/20 bg-sand/50 px-4 py-3",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-gold"
      >
        <path d="M12 2 L15.09 8.26 L22 9.27 L17 14.14 L18.18 21.02 L12 17.77 L5.82 21.02 L7 14.14 L2 9.27 L8.91 8.26 Z" />
      </svg>
      <p className="flex-1 text-body-sm text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={() => void openUpgradeUrl()}
        className="shrink-0 text-[12px] font-semibold text-gold hover:text-gold-soft"
      >
        Αναβάθμιση
      </button>
    </div>
  );
}
