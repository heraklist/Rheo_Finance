import type { SyncState } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, RotateCw, Wifi } from "lucide-react";

interface SyncPillProps {
  status?: SyncState;
  pendingCount?: number;
  className?: string;
}

const labels: Record<SyncState, string> = {
  synced: "Ενημερωμένο",
  syncing: "Συγχρονισμός…",
  offline: "Offline",
  error: "Σφάλμα · Επανάληψη",
};

const icons: Record<SyncState, typeof Check> = {
  synced: Check,
  syncing: RotateCw,
  offline: Wifi,
  error: AlertTriangle,
};

export function SyncPill({ status = "synced", pendingCount, className }: SyncPillProps) {
  const Icon = icons[status];
  let label = labels[status];
  if (status === "offline" && pendingCount && pendingCount > 0) {
    label = `Offline · ${pendingCount} ${pendingCount === 1 ? "αλλαγή" : "αλλαγές"}`;
  }
  return (
    <span className={cn("sync-pill max-w-[9.5rem] min-w-0 sm:max-w-none", status, className)}>
      <Icon
        className={cn("h-3 w-3 shrink-0", status === "syncing" && "animate-spin")}
        strokeWidth={2}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
