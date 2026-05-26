import { type ReviewGroup, type ReviewItem, buildReviewGroups } from "@/lib/review";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// === Badge component ===

type BadgeTone = "high" | "warn" | "good" | "neutral";

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}): React.JSX.Element {
  const toneClasses: Record<BadgeTone, string> = {
    neutral: "border-border-light bg-cream text-text-secondary",
    good: "border-income/20 bg-income/5 text-income",
    warn: "border-warning/30 bg-warning/5 text-warning",
    high: "border-expense/20 bg-expense/5 text-expense",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-semibold",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

function mapToneToBadge(tone: string): BadgeTone {
  if (tone === "high") return "high";
  if (tone === "medium") return "warn";
  return "neutral";
}

// === Review item card ===

function ReviewItemCard({
  item,
  onDismiss,
  onOpen,
}: {
  item: ReviewItem;
  onDismiss: () => void;
  onOpen: () => void;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-border-light bg-sand/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary">{item.label}</p>
          <p className="text-sm text-text-secondary">{item.meta}</p>
          <p className="mt-1 text-[11px] text-text-muted">{item.action}</p>
        </div>
        <AlertCircle className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-light bg-cream px-2.5 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-sand"
        >
          Παράβλεψη
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-light bg-cream px-2.5 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-sand"
        >
          Άνοιγμα
        </button>
      </div>
    </div>
  );
}

// === Review group section ===

function ReviewGroupSection({
  group,
  onDismissItem,
  onOpenItem,
}: {
  group: ReviewGroup;
  onDismissItem: (groupKey: string, itemId: string) => void;
  onOpenItem: (item: ReviewItem) => void;
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-md border border-border-light bg-cream">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{group.title}</span>
          <Badge tone={mapToneToBadge(group.tone)}>{group.items.length}</Badge>
        </span>
        <ChevronRight
          className={cn("h-4 w-4 text-text-muted transition-transform", !collapsed && "rotate-90")}
          strokeWidth={1.5}
        />
      </button>

      {!collapsed && (
        <div className="border-t border-border-light px-4 pb-4 pt-3">
          {group.items.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-income/20 bg-income/5 p-3 text-sm text-income">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />
              Δεν υπάρχουν ενεργά στοιχεία σε αυτή την ομάδα.
            </div>
          ) : (
            <div className="space-y-3">
              {group.items.map((item) => (
                <ReviewItemCard
                  key={item.id}
                  item={item}
                  onDismiss={() => onDismissItem(group.key, item.id)}
                  onOpen={() => onOpenItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Main page ===

export function ReviewQueue(): React.JSX.Element {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const result = await buildReviewGroups();
      setGroups(result);
    } catch (err) {
      console.error("Failed to load review groups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  function handleDismiss(groupKey: string, itemId: string): void {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === groupKey ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g,
      ),
    );
  }

  function handleOpen(item: ReviewItem): void {
    if (item.entityType === "transaction" && item.entityId) {
      navigate(`/transactions/${item.entityId}`);
    } else if (item.entityType === "recurring" && item.entityId) {
      navigate("/recurring");
    } else if (item.id === "sync-pending") {
      navigate("/settings");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="space-y-4">
          <div className="skel h-8 w-48" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="skel h-24" />
            <div className="skel h-24" />
            <div className="skel h-24" />
          </div>
          <div className="space-y-3">
            <div className="skel h-32" />
            <div className="skel h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-border-light pb-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-normal">Κέντρο Ελέγχου</h1>
            <p className="mt-1 text-xs text-text-muted">
              Γρήγορος έλεγχος εκκρεμοτήτων και ποιότητας δεδομένων.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={totalItems > 0 ? "warn" : "good"}>{totalItems} ενεργά στοιχεία</Badge>
            <button
              type="button"
              onClick={() => void loadGroups()}
              className="rounded-md border border-border-light bg-cream p-1.5 text-text-muted transition-colors hover:bg-sand hover:text-text-primary"
              aria-label="Ανανέωση"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          <div className="kpi-tile">
            <span className="text-label uppercase text-text-muted">Στοιχεία για έλεγχο</span>
            <span className="kpi-value">{totalItems}</span>
          </div>
          <div className="kpi-tile">
            <span className="text-label uppercase text-text-muted">Ομάδες</span>
            <span className="kpi-value">{groups.filter((g) => g.items.length > 0).length}</span>
          </div>
          <div className="kpi-tile col-span-2 md:col-span-1">
            <span className="text-label uppercase text-text-muted">Κατάσταση</span>
            <span className={cn("kpi-value", totalItems === 0 ? "text-income" : "text-warning")}>
              {totalItems === 0 ? "Καθαρό" : "Θέλει έλεγχο"}
            </span>
          </div>
        </div>

        {/* Groups */}
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map((group) => (
            <ReviewGroupSection
              key={group.key}
              group={group}
              onDismissItem={handleDismiss}
              onOpenItem={handleOpen}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
