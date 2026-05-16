import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type EditableCategoryType,
  archiveCategory,
  createCategory,
  deleteCategory,
  getCategoryUsage,
  listCategories,
  restoreCategory,
  updateCategoryName,
} from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertCircle, Archive, ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

type SheetMode = "create" | "edit";

const TYPE_LABELS: Record<EditableCategoryType, string> = {
  income: "Έσοδα",
  expense: "Έξοδα",
};

function categoryTypeFromParam(value: string | undefined): EditableCategoryType | null {
  if (value === "income" || value === "expense") return value;
  return null;
}

function usageMessage(parts: string[]): string {
  return `Δεν μπορεί να διαγραφεί γιατί χρησιμοποιείται σε ${parts.join(
    ", ",
  )}. Μπορείς να την αρχειοθετήσεις.`;
}

function isCategoryArchived(category: Category): boolean {
  return Number(category.is_archived) === 1;
}

export function CategorySettings() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const currentBookId = useAppStore((state) => state.currentBookId);
  const categoryType = categoryTypeFromParam(type);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCategories = useCallback(async () => {
    if (!categoryType) return;
    try {
      setLoading(true);
      setError("");
      const rows = await listCategories({
        bookId: currentBookId,
        type: categoryType,
        includeArchived: true,
      });
      setCategories(rows);
    } catch (err) {
      console.error("Failed to load categories:", err);
      setError("Δεν φορτώθηκαν οι κατηγορίες.");
    } finally {
      setLoading(false);
    }
  }, [categoryType, currentBookId]);

  useEffect(() => {
    if (!categoryType) {
      navigate("/settings", { replace: true });
      return;
    }
    void loadCategories();
  }, [categoryType, loadCategories, navigate]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, search]);
  const activeCategories = filteredCategories.filter((category) => !isCategoryArchived(category));
  const archivedCategories = filteredCategories.filter((category) => isCategoryArchived(category));

  function closeSheet() {
    setSheetMode(null);
    setSelected(null);
    setDraftName("");
  }

  function openCreateSheet() {
    setError("");
    setMessage("");
    setSelected(null);
    setDraftName("");
    setSheetMode("create");
  }

  function openEditSheet(category: Category) {
    setError("");
    setMessage("");
    setSelected(category);
    setDraftName(category.name);
    setSheetMode("edit");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryType || busy) return;

    const name = draftName.trim();
    if (!name) {
      setError("Δώσε όνομα κατηγορίας.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (sheetMode === "create") {
        await createCategory({ bookId: currentBookId, type: categoryType, name });
        setMessage("Η κατηγορία προστέθηκε.");
      } else if (selected) {
        await updateCategoryName(selected.id, name);
        setMessage("Η κατηγορία ενημερώθηκε.");
      }
      closeSheet();
      await loadCategories();
    } catch (err) {
      console.error("Failed to save category:", err);
      setError("Δεν αποθηκεύτηκε η κατηγορία.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive(category: Category) {
    if (busy) return;
    const confirmed = window.confirm(`Αρχειοθέτηση της κατηγορίας "${category.name}";`);
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await archiveCategory(category.id);
      setMessage("Η κατηγορία αρχειοθετήθηκε.");
      await loadCategories();
    } catch (err) {
      console.error("Failed to archive category:", err);
      setError("Δεν αρχειοθετήθηκε η κατηγορία.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(category: Category) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await restoreCategory(category.id);
      setMessage("Η κατηγορία ενεργοποιήθηκε ξανά.");
      await loadCategories();
    } catch (err) {
      console.error("Failed to restore category:", err);
      setError("Δεν ενεργοποιήθηκε η κατηγορία.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(category: Category) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const usage = await getCategoryUsage(category.id);
      if (usage.total > 0) {
        const parts: string[] = [];
        if (usage.transactions > 0) parts.push(`${usage.transactions} συναλλαγές`);
        if (usage.recurringTemplates > 0) parts.push(`${usage.recurringTemplates} πάγια`);
        if (usage.childCategories > 0) parts.push(`${usage.childCategories} υποκατηγορίες`);
        setError(usageMessage(parts));
        return;
      }

      const confirmed = window.confirm(
        `Οριστική διαγραφή της κατηγορίας "${category.name}"; Η ενέργεια δεν αναιρείται.`,
      );
      if (!confirmed) return;

      await deleteCategory(category.id);
      setMessage("Η κατηγορία διαγράφηκε.");
      await loadCategories();
    } catch (err) {
      console.error("Failed to delete category:", err);
      setError("Δεν διαγράφηκε η κατηγορία.");
    } finally {
      setBusy(false);
    }
  }

  function renderCategoryRow(category: Category) {
    const archived = isCategoryArchived(category);

    return (
      <article
        key={category.id}
        className={cn(
          "flex items-center justify-between gap-3 rounded-md border border-border-light bg-cream p-3",
          archived && "opacity-75",
        )}
      >
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-text-primary">{category.name}</h2>
          <p className="text-caption">
            {archived ? "Αρχειοθετημένη" : `Σειρά ${category.sort_order}`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {!archived ? (
            <>
              <button
                type="button"
                onClick={() => openEditSheet(category)}
                className="rounded-md p-2 text-text-secondary transition-colors hover:bg-sand hover:text-charcoal"
                aria-label="Επεξεργασία"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={() => void handleArchive(category)}
                disabled={busy}
                className="rounded-md p-2 text-text-secondary transition-colors hover:bg-sand hover:text-charcoal disabled:opacity-50"
                aria-label="Αρχειοθέτηση"
              >
                <Archive className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleRestore(category)}
              disabled={busy}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-sand disabled:opacity-50"
            >
              Επαναφορά
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleDelete(category)}
            disabled={busy}
            className="rounded-md p-2 text-expense transition-colors hover:bg-expense-light/30 disabled:opacity-50"
            aria-label="Διαγραφή"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
      </article>
    );
  }

  if (!categoryType) return null;

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="topbar flow-topbar -mx-4 -mt-4 mb-4">
        <div className="flex items-center gap-3">
          <Link to="/settings" aria-label="Πίσω" className="text-charcoal">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Link>
          <div>
            <h1 className="text-h2">Κατηγορίες</h1>
            <p className="text-caption">{TYPE_LABELS[categoryType]}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreateSheet}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-charcoal text-text-on-dark transition-colors hover:bg-charcoal-soft"
          aria-label="Νέα κατηγορία"
        >
          <Plus className="h-4.5 w-4.5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Αναζήτηση κατηγορίας"
          className="border-border-light bg-cream pl-9"
        />
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-md border border-expense-light bg-cream p-4 text-expense">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={1.7} />
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-md border border-income-light bg-cream p-4 text-sm text-income">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skel h-16" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <section className="rounded-md border border-border-light bg-cream p-7 text-center">
          <p className="text-body mb-1">Δεν βρέθηκαν κατηγορίες</p>
          <p className="text-caption mb-4">Πρόσθεσε νέα κατηγορία για αυτό το βιβλίο.</p>
          <button
            type="button"
            onClick={openCreateSheet}
            className="inline-flex items-center gap-2 rounded-md bg-charcoal px-3.5 py-2 text-sm font-medium text-text-on-dark transition-colors hover:bg-charcoal-soft"
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            Νέα κατηγορία
          </button>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="space-y-2.5">
            <div className="text-label uppercase text-text-muted">Ενεργές</div>
            {activeCategories.length > 0 ? (
              activeCategories.map(renderCategoryRow)
            ) : (
              <div className="rounded-md border border-border-light bg-cream p-4 text-caption">
                Δεν υπάρχουν ενεργές κατηγορίες.
              </div>
            )}
          </section>

          {archivedCategories.length > 0 ? (
            <section className="space-y-2.5">
              <div className="text-label uppercase text-text-muted">Αρχειοθετημένες</div>
              {archivedCategories.map(renderCategoryRow)}
            </section>
          ) : null}
        </div>
      )}

      <Sheet open={sheetMode !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="bottom" className="rounded-t-md border-border-light bg-cream">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>{sheetMode === "create" ? "Νέα κατηγορία" : "Επεξεργασία"}</SheetTitle>
            <SheetDescription>{TYPE_LABELS[categoryType]} για το τρέχον βιβλίο.</SheetDescription>
          </SheetHeader>
          <form className="mt-4 space-y-4" onSubmit={handleSave}>
            <div>
              <label className="form-label" htmlFor="category-name">
                Όνομα
              </label>
              <Input
                id="category-name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className={cn(
                  "border-border-light bg-cream",
                  error && !draftName.trim() && "error",
                )}
                autoFocus
              />
            </div>
            <SheetFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeSheet}
                disabled={busy}
                className="border-border-light bg-cream"
              >
                Άκυρο
              </Button>
              <Button type="submit" disabled={busy} className="bg-charcoal text-text-on-dark">
                {busy ? "Αποθήκευση..." : "Αποθήκευση"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
