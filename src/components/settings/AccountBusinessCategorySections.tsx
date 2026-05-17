import type { EditableCategoryType } from "@/lib/reference";
import { Building2, ChevronRight, FolderTree, LogOut, Save, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";

function sectionClassName(extra = ""): string {
  return `bg-cream border border-border-light rounded-md p-4 ${extra}`;
}

interface AccountSectionProps {
  userEmail: string | null | undefined;
  deletingAccount: boolean;
  accountMessage: string;
  onSignOut: () => void;
  onDeleteAccount: () => void;
}

export function AccountSection({
  userEmail,
  deletingAccount,
  accountMessage,
  onSignOut,
  onDeleteAccount,
}: AccountSectionProps) {
  return (
    <section className={sectionClassName()}>
      <h2 className="text-h3 mb-2">Λογαριασμός</h2>
      <p className="text-text-muted text-sm mb-4">{userEmail ?? "Συνδεδεμένος χρήστης"}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.7} />
          Αποσύνδεση
        </button>
        <button
          type="button"
          onClick={onDeleteAccount}
          disabled={deletingAccount}
          className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.7} />
          {deletingAccount ? "Διαγραφή..." : "Διαγραφή λογαριασμού"}
        </button>
      </div>
      {accountMessage ? <p className="text-caption mt-3 text-expense">{accountMessage}</p> : null}
    </section>
  );
}

interface BusinessSectionProps {
  companyDraft: string;
  companyEditing: boolean;
  displayCompanyName: string;
  onCancel: () => void;
  onDraftChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
}

export function BusinessSection({
  companyDraft,
  companyEditing,
  displayCompanyName,
  onCancel,
  onDraftChange,
  onEdit,
  onSave,
}: BusinessSectionProps) {
  const isEmpty = !displayCompanyName.trim();

  return (
    <section className={sectionClassName()}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h3">Επιχείρηση</h2>
          {isEmpty ? (
            <p className="text-caption mt-1 text-warning">
              Δεν έχεις ορίσει όνομα επιχείρησης. Πρόσθεσέ το ώστε να εμφανίζεται σε λογαριασμούς
              και export.
            </p>
          ) : (
            <p className="text-caption mt-1">
              Το όνομα εμφανίζεται σε ονόματα λογαριασμών και στο export.
            </p>
          )}
        </div>
        <Building2 className="h-5 w-5 text-gold" strokeWidth={1.7} />
      </div>
      {companyEditing ? (
        <div className="space-y-3">
          <div>
            <label className="form-label" htmlFor="company-name">
              Όνομα επιχείρησης
            </label>
            <input
              id="company-name"
              value={companyDraft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="π.χ. Acme Catering, Studio Smith, κλπ."
              className="w-full rounded-md border border-border-light bg-cream px-3 py-2.5 text-sm focus:border-charcoal focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-text-on-dark"
            >
              <Save className="h-4 w-4" strokeWidth={1.7} />
              Αποθήκευση
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:underline"
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
              Άκυρο
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {isEmpty ? (
              <p className="text-sm text-text-muted italic">Δεν έχει οριστεί</p>
            ) : (
              <p className="truncate text-sm font-medium text-text-primary">{displayCompanyName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-sm font-medium text-gold hover:underline"
          >
            {isEmpty ? "Προσθήκη" : "Επεξεργασία"}
          </button>
        </div>
      )}
    </section>
  );
}

interface CategoriesSectionProps {
  categoryCounts: Record<EditableCategoryType, number>;
  currentBookLabel: string;
}

export function CategoriesSection({ categoryCounts, currentBookLabel }: CategoriesSectionProps) {
  return (
    <section className={sectionClassName()}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h3">Κατηγορίες</h2>
          <p className="text-caption mt-1">{currentBookLabel}</p>
        </div>
        <FolderTree className="h-5 w-5 text-gold" strokeWidth={1.7} />
      </div>
      <div className="divide-y divide-border-light overflow-hidden rounded-md border border-border-light">
        <Link
          to="/settings/categories/income"
          className="flex items-center justify-between gap-3 bg-sand px-3 py-3 transition-colors hover:bg-cream"
        >
          <div>
            <p className="text-sm font-medium text-text-primary">Έσοδα</p>
            <p className="text-caption">{categoryCounts.income} ενεργές κατηγορίες</p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted" strokeWidth={1.7} />
        </Link>
        <Link
          to="/settings/categories/expense"
          className="flex items-center justify-between gap-3 bg-sand px-3 py-3 transition-colors hover:bg-cream"
        >
          <div>
            <p className="text-sm font-medium text-text-primary">Έξοδα</p>
            <p className="text-caption">{categoryCounts.expense} ενεργές κατηγορίες</p>
          </div>
          <ChevronRight className="h-4 w-4 text-text-muted" strokeWidth={1.7} />
        </Link>
      </div>
    </section>
  );
}
