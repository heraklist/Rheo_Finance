import { cn } from "@/lib/utils";
import { AlertTriangle, Check, RotateCw, Wifi } from "lucide-react";

export type SyncState = "synced" | "syncing" | "offline" | "error";

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
    <span className={cn("sync-pill", status, className)}>
      <Icon className={cn("w-3 h-3", status === "syncing" && "animate-spin")} strokeWidth={2} />
      {label}
    </span>
  );
}
