import { MfaSettingsPanel } from "@/components/auth/MfaSettingsPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteCurrentAccount } from "@/lib/account";
import { createJsonBackup } from "@/lib/backup";
import {
  type ExportBookScope,
  type ExportPeriod,
  currentQuarterPeriods,
  saveFinanceExport,
} from "@/lib/export";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getPendingCount, resetSyncStateForFullPull, syncAll } from "@/lib/sync";
import type { PaymentMethod } from "@/lib/types";
import { formatDateRelative } from "@/lib/utils";
import {
  DatabaseBackup,
  ExternalLink,
  FileSpreadsheet,
  Info,
  LogOut,
  RefreshCcw,
  RotateCw,
  Settings2,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const APP_VERSION = "0.1.0";
const CURRENT_YEAR = new Date().getFullYear();
const VAT_RATES = [
  { label: "24%", value: 0.24 },
  { label: "13%", value: 0.13 },
  { label: "6%", value: 0.06 },
  { label: "0%", value: 0 },
];
const PAYMENT_METHODS: PaymentMethod[] = ["Μετρητά", "Κάρτα", "Τραπεζική μεταφορά", "IRIS", "Άλλο"];
const BOOK_OPTIONS = [
  { label: "Επαγγελματικά", value: "book-business" },
  { label: "Προσωπικά", value: "book-personal" },
];
const EXPORT_BOOK_OPTIONS: Array<{ label: string; value: ExportBookScope }> = [
  { label: "Επαγγελματικά", value: "business" },
  { label: "Προσωπικά", value: "personal" },
  { label: "Και τα δύο", value: "both" },
];

type PeriodKey = "q1" | "q2" | "q3" | "q4" | "custom";

function sectionClassName(extra = ""): string {
  return `bg-cream border border-border-light rounded-md p-4 ${extra}`;
}

export function Settings() {
  const {
    user,
    syncState,
    lastSyncedAt,
    pendingCount,
    currentBookId,
    defaultVatRate,
    defaultPaymentMethod,
    autoBackupEnabled,
    setCurrentBookId,
    setDefaultPaymentMethod,
    setDefaultVatRate,
    setAutoBackupEnabled,
    setLastSyncedAt,
    setMfaStatus,
    setPendingCount,
    setSyncState,
  } = useAppStore();
  const navigate = useNavigate();
  const quarterPeriods = useMemo(() => currentQuarterPeriods(CURRENT_YEAR), []);
  const [manualSyncing, setManualSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [backupRunning, setBackupRunning] = useState(false);
  const [exportRunning, setExportRunning] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [periodKey, setPeriodKey] = useState<PeriodKey>("q1");
  const [customFromDate, setCustomFromDate] = useState(`${CURRENT_YEAR}-01-01`);
  const [customToDate, setCustomToDate] = useState(`${CURRENT_YEAR}-12-31`);
  const [exportBookScope, setExportBookScope] = useState<ExportBookScope>("business");

  const selectedPeriod: ExportPeriod = useMemo(() => {
    if (periodKey === "custom") {
      return {
        label: `${customFromDate}_${customToDate}`,
        fromDate: customFromDate,
        toDate: customToDate,
      };
    }

    const index = Number(periodKey.slice(1)) - 1;
    return (
      quarterPeriods[index] ?? {
        label: `${CURRENT_YEAR} Q1`,
        fromDate: `${CURRENT_YEAR}-01-01`,
        toDate: `${CURRENT_YEAR}-03-31`,
      }
    );
  }, [customFromDate, customToDate, periodKey, quarterPeriods]);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error);
      return;
    }

    setMfaStatus(false, false);
    navigate("/login");
  }

  async function handleDeleteAccount() {
    if (deletingAccount) return;

    const confirmed = window.confirm(
      "Η διαγραφή λογαριασμού θα αφαιρέσει τον χρήστη και τα remote δεδομένα του. Συνέχεια;",
    );
    if (!confirmed) return;

    const typed = window.prompt("Πληκτρολόγησε ΔΙΑΓΡΑΦΗ για οριστική επιβεβαίωση.");
    if (typed !== "ΔΙΑΓΡΑΦΗ") return;

    setDeletingAccount(true);
    setAccountMessage("");

    try {
      await deleteCurrentAccount();
      setMfaStatus(false, false);
      navigate("/login");
    } catch (err) {
      console.error("Delete account failed:", err);
      setAccountMessage(
        "Δεν διαγράφηκε ο λογαριασμός. Έλεγξε ότι πέρασε το Supabase migration 004.",
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  async function handleManualSync() {
    if (manualSyncing) return;

    setManualSyncing(true);
    setSyncMessage("");
    setSyncState("syncing");

    try {
      const result = await syncAll();
      const timestamp = new Date().toISOString();
      const nextPendingCount = await getPendingCount();
      setSyncState("synced");
      setLastSyncedAt(timestamp);
      setPendingCount(nextPendingCount);
      setSyncMessage(`Συγχρονίστηκαν ${result.pushed} push και ${result.pulled} pull.`);
    } catch (err) {
      console.error("Manual sync failed:", err);
      setSyncState("error");
      setSyncMessage("Ο συγχρονισμός απέτυχε. Δοκίμασε ξανά.");
    } finally {
      setManualSyncing(false);
    }
  }

  async function handleResetSync() {
    const confirmed = window.confirm(
      "Θα μηδενιστεί το last synced και το επόμενο sync θα κάνει πλήρες re-pull. Συνέχεια;",
    );
    if (!confirmed) return;

    try {
      await resetSyncStateForFullPull();
      setLastSyncedAt(null);
      setSyncState("synced");
      setSyncMessage("Το sync state μηδενίστηκε. Τρέξε συγχρονισμό για πλήρες re-pull.");
    } catch (err) {
      console.error("Reset sync failed:", err);
      setSyncMessage("Δεν μηδενίστηκε το sync state.");
    }
  }

  async function handleBackup() {
    if (backupRunning) return;

    setBackupRunning(true);
    setBackupMessage("");

    try {
      const result = await createJsonBackup();
      setBackupMessage(`Δημιουργήθηκε backup: ${result.path}`);
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupMessage("Δεν δημιουργήθηκε backup.");
    } finally {
      setBackupRunning(false);
    }
  }

  async function handleExport() {
    if (exportRunning) return;

    setExportRunning(true);
    setExportMessage("");

    try {
      const result = await saveFinanceExport({
        period: selectedPeriod,
        bookScope: exportBookScope,
      });

      if (!result) {
        setExportMessage("Η εξαγωγή ακυρώθηκε.");
      } else {
        setExportMessage(`Αποθηκεύτηκε Excel με ${result.transactionCount} συναλλαγές.`);
      }
    } catch (err) {
      console.error("Export failed:", err);
      setExportMessage("Δεν δημιουργήθηκε το Excel export.");
    } finally {
      setExportRunning(false);
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-h1">Ρυθμίσεις</h1>
        <p className="text-caption mt-1">Λογαριασμός, ασφάλεια, συγχρονισμός και export</p>
      </div>

      <section className={sectionClassName()}>
        <h2 className="text-h3 mb-2">Λογαριασμός</h2>
        <p className="text-text-muted text-sm mb-4">{user?.email ?? "Συνδεδεμένος χρήστης"}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.7} />
            Αποσύνδεση
          </button>
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.7} />
            {deletingAccount ? "Διαγραφή..." : "Διαγραφή λογαριασμού"}
          </button>
        </div>
        {accountMessage ? <p className="text-caption mt-3 text-expense">{accountMessage}</p> : null}
      </section>

      <MfaSettingsPanel />

      <section className={sectionClassName()}>
        <h2 className="text-h3 mb-2">Συγχρονισμός</h2>
        <div className="space-y-1.5 text-sm text-text-muted mb-4">
          <div>
            Κατάσταση: <span className="text-text-primary">{syncState}</span>
          </div>
          {lastSyncedAt ? (
            <div>
              Τελευταίος συγχρονισμός:{" "}
              <span className="text-text-primary">{formatDateRelative(lastSyncedAt)}</span>
            </div>
          ) : null}
          <div>
            Εκκρεμούν: <span className="text-text-primary">{pendingCount}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={manualSyncing}
            className="inline-flex items-center gap-2 text-gold text-sm font-medium hover:underline disabled:opacity-50"
          >
            <RotateCw
              className={`w-4 h-4 ${manualSyncing ? "animate-spin" : ""}`}
              strokeWidth={1.7}
            />
            {manualSyncing ? "Συγχρονισμός..." : "Συγχρονισμός τώρα"}
          </button>
          <button
            type="button"
            onClick={handleResetSync}
            className="inline-flex items-center gap-2 text-text-secondary text-sm font-medium hover:underline"
          >
            <RefreshCcw className="w-4 h-4" strokeWidth={1.7} />
            Reset sync state
          </button>
        </div>
        {syncMessage ? <p className="text-caption mt-3">{syncMessage}</p> : null}
      </section>

      <section className={sectionClassName()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-h3">Backup</h2>
            <p className="text-caption mt-1">Τοπικό JSON snapshot στο Documents/Evochia_Backups.</p>
          </div>
          <DatabaseBackup className="w-5 h-5 text-gold" strokeWidth={1.7} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBackup}
            disabled={backupRunning}
            className="inline-flex items-center gap-2 rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-text-on-dark disabled:opacity-50"
          >
            <DatabaseBackup className="w-4 h-4" strokeWidth={1.7} />
            {backupRunning ? "Backup..." : "Δημιουργία backup"}
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              onChange={(event) => setAutoBackupEnabled(event.target.checked)}
              className="h-4 w-4 accent-gold"
            />
            Εβδομαδιαίο auto-backup
          </label>
        </div>
        {backupMessage ? <p className="text-caption mt-3 break-all">{backupMessage}</p> : null}
        <p className="text-caption mt-3 text-text-muted">
          Restore από backup θα μπει σε ξεχωριστό ασφαλές flow για να αποφύγουμε κατά λάθος απώλεια
          δεδομένων.
        </p>
      </section>

      <section className={sectionClassName()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-h3">Export</h2>
            <p className="text-caption mt-1">
              Excel για λογιστή με συναλλαγές, ΦΠΑ και κατηγορίες.
            </p>
          </div>
          <FileSpreadsheet className="w-5 h-5 text-gold" strokeWidth={1.7} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="form-label" htmlFor="export-period">
              Περίοδος
            </label>
            <Select value={periodKey} onValueChange={(value) => setPeriodKey(value as PeriodKey)}>
              <SelectTrigger id="export-period" className="bg-cream border-border-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {quarterPeriods.map((period, index) => (
                  <SelectItem key={period.label} value={`q${index + 1}`}>
                    {period.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="form-label" htmlFor="export-book">
              Book
            </label>
            <Select
              value={exportBookScope}
              onValueChange={(value) => setExportBookScope(value as ExportBookScope)}
            >
              <SelectTrigger id="export-book" className="bg-cream border-border-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_BOOK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleExport}
              disabled={exportRunning}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-charcoal px-3 py-2.5 text-sm font-medium text-text-on-dark disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" strokeWidth={1.7} />
              {exportRunning ? "Δημιουργία..." : "Δημιουργία Excel"}
            </button>
          </div>
        </div>

        {periodKey === "custom" ? (
          <div className="grid gap-3 md:grid-cols-2 mt-3">
            <div>
              <label className="form-label" htmlFor="custom-from">
                Από
              </label>
              <input
                id="custom-from"
                type="date"
                value={customFromDate}
                onChange={(event) => setCustomFromDate(event.target.value)}
                className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="custom-to">
                Έως
              </label>
              <input
                id="custom-to"
                type="date"
                value={customToDate}
                onChange={(event) => setCustomToDate(event.target.value)}
                className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
              />
            </div>
          </div>
        ) : null}

        {exportMessage ? <p className="text-caption mt-3">{exportMessage}</p> : null}
      </section>

      <section className={sectionClassName()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-h3">Προτιμήσεις</h2>
            <p className="text-caption mt-1">Defaults για νέες καταχωρήσεις.</p>
          </div>
          <Settings2 className="w-5 h-5 text-gold" strokeWidth={1.7} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="form-label" htmlFor="pref-vat">
              Default ΦΠΑ
            </label>
            <Select
              value={String(defaultVatRate)}
              onValueChange={(value) => setDefaultVatRate(Number(value))}
            >
              <SelectTrigger id="pref-vat" className="bg-cream border-border-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VAT_RATES.map((vat) => (
                  <SelectItem key={vat.value} value={String(vat.value)}>
                    {vat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label" htmlFor="pref-book">
              Default book
            </label>
            <Select value={currentBookId} onValueChange={setCurrentBookId}>
              <SelectTrigger id="pref-book" className="bg-cream border-border-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOOK_OPTIONS.map((book) => (
                  <SelectItem key={book.value} value={book.value}>
                    {book.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="form-label" htmlFor="pref-payment">
              Default πληρωμή
            </label>
            <Select
              value={defaultPaymentMethod}
              onValueChange={(value) => setDefaultPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger id="pref-payment" className="bg-cream border-border-light">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-caption mt-3">
          Νόμισμα: EUR. Άλλα νομίσματα θα μπουν σε μελλοντική φάση.
        </p>
      </section>

      <section className={sectionClassName("mb-8")}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-h3">Σχετικά</h2>
            <p className="text-caption mt-1">Finance v{APP_VERSION}</p>
          </div>
          <Info className="w-5 h-5 text-gold" strokeWidth={1.7} />
        </div>
        <div className="space-y-3 text-sm">
          <button
            type="button"
            onClick={() => window.open("https://github.com/heraklist/evochia_finance", "_blank")}
            className="inline-flex items-center gap-2 text-gold font-medium hover:underline"
          >
            <ExternalLink className="w-4 h-4" strokeWidth={1.7} />
            Άνοιγμα repo
          </button>
          <div className="flex items-start gap-2 text-text-muted">
            <ShieldAlert className="w-4 h-4 mt-0.5 text-gold" strokeWidth={1.7} />
            <p>Άδεια: ιδιωτική χρήση Heraklis / Evochia.</p>
          </div>
          <button
            type="button"
            onClick={() => window.alert("Δεν βρέθηκαν διαθέσιμες ενημερώσεις.")}
            className="inline-flex items-center gap-2 text-text-secondary font-medium hover:underline"
          >
            <RefreshCcw className="w-4 h-4" strokeWidth={1.7} />
            Έλεγχος ενημερώσεων
          </button>
        </div>
      </section>
    </div>
  );
}
