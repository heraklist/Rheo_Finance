import { RecurringForm, type RecurringFormValues } from "@/components/recurring/RecurringForm";
import { useDisplayAccountName } from "@/hooks/useDisplayAccountName";
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  generateDueRecurringTransactions,
  listRecurringTemplates,
  setRecurringTemplateActive,
  updateRecurringTemplate,
} from "@/lib/recurring";
import { useAppStore } from "@/lib/store";
import { getPendingCount } from "@/lib/sync";
import type { CategoryType, Frequency, RecurringTemplateWithRelations } from "@/lib/types";
import { cn, formatDateRelative, formatEuro } from "@/lib/utils";
import { AlertCircle, ArrowLeft, Pause, Pencil, Plus, Repeat2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Mode = "list" | "create" | "edit";
type RecurringType = Extract<CategoryType, "income" | "expense" | "reserve">;

const FREQUENCY_LABELS: Record<Frequency, string> = {
  monthly: "Μηνιαίο",
  weekly: "Εβδομαδιαίο",
  quarterly: "Τριμηνιαίο",
  yearly: "Ετήσιο",
};

function editableType(template: RecurringTemplateWithRelations): RecurringType {
  if (template.category_type === "income") return "income";
  if (template.category_type === "reserve") return "reserve";
  return "expense";
}

function amountInput(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

function signedAmount(template: RecurringTemplateWithRelations): string {
  const sign =
    template.category_type === "income" ? "+" : template.category_type === "expense" ? "−" : "";
  return `${sign}${formatEuro(template.amount_gross)}`;
}

function templateAmountClass(template: RecurringTemplateWithRelations): string {
  if (template.category_type === "income") return "text-income";
  if (template.category_type === "expense") return "text-expense";
  return "text-text-primary";
}

function dueLabel(template: RecurringTemplateWithRelations): string {
  if (!template.active) return "Σε παύση";
  if (!template.next_due) return "Ολοκληρώθηκε";
  return formatDateRelative(template.next_due);
}

export function Recurring() {
  const currentBookId = useAppStore((state) => state.currentBookId);
  const setPendingCount = useAppStore((state) => state.setPendingCount);
  const displayAccountName = useDisplayAccountName();
  const [mode, setMode] = useState<Mode>("list");
  const [templates, setTemplates] = useState<RecurringTemplateWithRelations[]>([]);
  const [selected, setSelected] = useState<RecurringTemplateWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const rows = await listRecurringTemplates();
      setTemplates(rows.filter((template) => template.book_id === currentBookId));
    } catch (err) {
      console.error("Failed to load recurring templates:", err);
      setError("Δεν φορτώθηκαν τα πάγια.");
    } finally {
      setLoading(false);
    }
  }, [currentBookId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  async function generateDueAndRefreshPending() {
    const result = await generateDueRecurringTransactions();
    if (result.generated > 0 || result.skipped > 0) {
      setPendingCount(await getPendingCount());
    }
  }

  async function handleCreate(values: RecurringFormValues) {
    await createRecurringTemplate(values);
    await generateDueAndRefreshPending();
    await loadTemplates();
    setMode("list");
  }

  async function handleUpdate(values: RecurringFormValues) {
    if (!selected) return;
    await updateRecurringTemplate({ id: selected.id, ...values });
    await generateDueAndRefreshPending();
    await loadTemplates();
    setSelected(null);
    setMode("list");
  }

  async function handleToggle(template: RecurringTemplateWithRelations) {
    if (busyId) return;
    setBusyId(template.id);
    setError("");

    try {
      await setRecurringTemplateActive(template.id, !template.active);
      await loadTemplates();
    } catch (err) {
      console.error("Failed to toggle recurring template:", err);
      setError("Δεν ενημερώθηκε το πάγιο.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!selected || busyId) return;

    const confirmed = window.confirm(
      `Διαγραφή του πάγιου "${selected.description}"; Οι συναλλαγές που έχουν ήδη δημιουργηθεί θα μείνουν.`,
    );
    if (!confirmed) return;

    setBusyId(selected.id);
    setError("");

    try {
      await deleteRecurringTemplate(selected.id);
      await loadTemplates();
      setSelected(null);
      setMode("list");
    } catch (err) {
      console.error("Failed to delete recurring template:", err);
      setError("Δεν διαγράφηκε το πάγιο.");
    } finally {
      setBusyId(null);
    }
  }

  if (mode === "create") {
    return (
      <div className="flex h-full flex-col">
        <div className="topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode("list")}
              aria-label="Πίσω"
              className="text-charcoal"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-h2">Νέο πάγιο</h1>
          </div>
        </div>
        <RecurringForm
          submitLabel="Καταχώρηση"
          submittingLabel="Αποθήκευση..."
          onSubmit={handleCreate}
          onCancel={() => setMode("list")}
        />
      </div>
    );
  }

  if (mode === "edit" && selected) {
    return (
      <div className="flex h-full flex-col">
        <div className="topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setMode("list");
              }}
              aria-label="Πίσω"
              className="text-charcoal"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h1 className="text-h2">Επεξεργασία πάγιου</h1>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busyId === selected.id}
            className="p-2 rounded-md text-expense hover:bg-expense-light/30 disabled:opacity-50 transition-colors"
            aria-label="Διαγραφή"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.7} />
          </button>
        </div>
        <RecurringForm
          initialValues={{
            active: selected.active,
            amount: amountInput(selected.amount_gross),
            type: editableType(selected),
            description: selected.description,
            accountId: selected.account_id,
            categoryId: selected.category_id,
            vatRate: selected.vat_rate,
            frequency: selected.frequency,
            dayOfPeriod: selected.day_of_period,
            startDate: selected.start_date,
            endDate: selected.end_date ?? "",
            tagName: selected.tag_name ?? "",
          }}
          submitLabel="Αποθήκευση αλλαγών"
          submittingLabel="Αποθήκευση..."
          onSubmit={handleUpdate}
          onCancel={() => {
            setSelected(null);
            setMode("list");
          }}
        />
      </div>
    );
  }

  const activeCount = templates.filter((template) => template.active).length;
  const nextTemplate = templates
    .filter((template) => template.active && template.next_due)
    .sort((a, b) => String(a.next_due).localeCompare(String(b.next_due)))[0];

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border-light">
        <div className="min-w-0">
          <h1 className="text-h2">Πάγια</h1>
          <p className="text-caption mt-0.5">Επαναλαμβανόμενες εγγραφές</p>
        </div>
        <button
          type="button"
          onClick={() => setMode("create")}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-charcoal text-text-on-dark hover:bg-charcoal-soft transition-colors"
          aria-label="Νέο πάγιο"
        >
          <Plus className="w-4.5 h-4.5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <section className="bg-cream border border-border-light rounded-md p-4">
          <p className="text-label uppercase text-text-muted mb-2">Ενεργά</p>
          <p className="text-num-xl text-text-primary tabular-nums">{activeCount}</p>
        </section>
        <section className="bg-cream border border-border-light rounded-md p-4">
          <p className="text-label uppercase text-text-muted mb-2">Επόμενο</p>
          <p className="text-sm font-medium text-text-primary truncate">
            {nextTemplate ? dueLabel(nextTemplate) : "—"}
          </p>
          {nextTemplate ? (
            <p className="text-caption truncate">{nextTemplate.description}</p>
          ) : null}
        </section>
      </div>

      {error ? (
        <div className="bg-cream border border-expense-light rounded-md p-4 mb-4 text-expense flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skel h-24" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-cream border border-border-light rounded-md p-7 text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-sand border border-border-light flex items-center justify-center text-text-muted">
            <Repeat2 className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-body mb-1">Κανένα πάγιο ακόμα</p>
          <p className="text-caption mb-4">
            Πρόσθεσε ΔΕΗ, ενοίκιο, συνδρομές ή άλλα σταθερά έξοδα.
          </p>
          <button
            type="button"
            onClick={() => setMode("create")}
            className="inline-flex items-center gap-2 bg-charcoal text-text-on-dark rounded-md px-3.5 py-2 text-sm font-medium hover:bg-charcoal-soft transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={1.8} />
            Νέο πάγιο
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className={cn(
                "bg-cream border border-border-light rounded-md overflow-hidden",
                !template.active && "opacity-75",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setSelected(template);
                  setMode("edit");
                }}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-light bg-sand text-gold">
                        {template.active ? (
                          <Repeat2 className="h-4 w-4" strokeWidth={1.7} />
                        ) : (
                          <Pause className="h-4 w-4" strokeWidth={1.7} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-text-primary">
                          {template.description}
                        </h2>
                        <p className="text-caption truncate">
                          {template.category_name ?? "—"}
                          {template.account_name
                            ? ` · ${displayAccountName(template.account_name)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums whitespace-nowrap",
                      templateAmountClass(template),
                    )}
                  >
                    {signedAmount(template)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-caption">
                  <div className="rounded-sm border border-border-light bg-sand px-2 py-1.5">
                    <span className="text-text-muted">Συχνότητα: </span>
                    <span className="text-text-primary">
                      {FREQUENCY_LABELS[template.frequency]}
                    </span>
                  </div>
                  <div className="rounded-sm border border-border-light bg-sand px-2 py-1.5">
                    <span className="text-text-muted">Επόμενο: </span>
                    <span className="text-text-primary">{dueLabel(template)}</span>
                  </div>
                </div>
              </button>

              <div className="flex items-center justify-between gap-3 border-t border-border-light px-4 py-2.5">
                <span className="min-w-0 truncate text-caption text-text-muted">
                  {template.last_generated
                    ? `Τελευταίο: ${formatDateRelative(template.last_generated)}`
                    : "Δεν έχει δημιουργηθεί ακόμα"}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(template);
                      setMode("edit");
                    }}
                    className="p-1.5 rounded-md text-text-secondary hover:text-charcoal hover:bg-sand transition-colors"
                    aria-label="Επεξεργασία"
                  >
                    <Pencil className="w-4 h-4" strokeWidth={1.7} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggle(template)}
                    disabled={busyId === template.id}
                    className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold disabled:opacity-50 ${
                      template.active
                        ? "bg-income-light text-income"
                        : "bg-sand text-text-secondary border border-border-light"
                    }`}
                    role="switch"
                    aria-checked={template.active}
                  >
                    {template.active ? "On" : "Off"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
