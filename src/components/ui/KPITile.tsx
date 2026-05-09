import { cn, formatEuro } from "@/lib/utils";

interface KPITileProps {
  label: string;
  value?: number;
  /** "income" → green, "expense" → red, "default" → charcoal */
  accent?: "income" | "expense" | "default";
  /** Use sand background instead of cream */
  sand?: boolean;
  /** Render skeleton shimmer instead of value */
  loading?: boolean;
  /** Render em-dash placeholder instead of value */
  empty?: boolean;
  /** Optional trend caption (e.g., "+12% vs τελευταίος μήνας") */
  trend?: string;
  /** Display as compact integer (no decimal) */
  compact?: boolean;
}

export function KPITile({
  label,
  value,
  accent = "default",
  sand,
  loading,
  empty,
  trend,
  compact = true,
}: KPITileProps) {
  return (
    <div
      className={cn(
        "kpi-tile",
        sand && "is-sand",
        accent === "income" && "is-income",
        accent === "expense" && "is-expense",
      )}
    >
      <div className="text-label uppercase text-text-muted">{label}</div>
      {loading ? (
        <div className="skel h-7 w-3/5" />
      ) : (
        <div className="kpi-value">
          {empty || value === undefined ? "—" : formatEuro(value, { compact })}
        </div>
      )}
      {trend && !loading && !empty && <div className="text-caption text-text-muted">{trend}</div>}
    </div>
  );
}
