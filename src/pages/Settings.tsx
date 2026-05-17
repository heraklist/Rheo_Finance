import { MfaSettingsPanel } from "@/components/auth/MfaSettingsPanel";
import {
  AboutSection,
  AccountSection,
  BackupSection,
  BusinessSection,
  CategoriesSection,
  ExportSection,
  PreferencesSection,
  SyncSection,
} from "@/components/settings/SettingsSections";
import {
  APP_VERSION,
  BOOK_OPTIONS,
  CURRENT_YEAR,
  EXPORT_BOOK_OPTIONS,
  PAYMENT_METHODS,
  type PeriodKey,
  VAT_RATES,
  resolveExportPeriod,
} from "@/components/settings/settingsOptions";
import { deleteCurrentAccount } from "@/lib/account";
import {
  createBackupFileName,
  createJsonBackup,
  getDefaultBackupDirectory,
  getLastAutoBackupAt,
  restoreFromBackupPath,
  saveJsonBackupToPath,
} from "@/lib/backup";
import { normalizeCompanyName } from "@/lib/company";
import { type ExportBookScope, currentQuarterPeriods, saveFinanceExport } from "@/lib/export";
import { type EditableCategoryType, listCategoryCounts } from "@/lib/reference";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getPendingCount, resetSyncStateForFullPull, syncAll } from "@/lib/sync";
import { checkForUpdate } from "@/lib/updater";
import {
  clearUpdaterGitHubToken,
  hasUpdaterGitHubToken,
  setUpdaterGitHubToken,
} from "@/lib/updaterToken";
import { documentDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function messageFromError(err: unknown): string {
  return err instanceof Error && err.message ? err.message : "Άγνωστο σφάλμα.";
}

export function Settings() {
  const {
    user,
    syncState,
    lastSyncedAt,
    pendingCount,
    currentBookId,
    companyName,
    defaultVatRate,
    defaultPaymentMethod,
    autoBackupEnabled,
    backupDirectory,
    setCurrentBookId,
    setCompanyName,
    setBackupDirectory,
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
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [githubTokenDraft, setGithubTokenDraft] = useState("");
  const [githubTokenSaved, setGithubTokenSaved] = useState(false);
  const [githubTokenMessage, setGithubTokenMessage] = useState("");
  const [backupRunning, setBackupRunning] = useState(false);
  const [driveBackupRunning, setDriveBackupRunning] = useState(false);
  const [restoreRunning, setRestoreRunning] = useState(false);
  const [exportRunning, setExportRunning] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [savingGithubToken, setSavingGithubToken] = useState(false);
  const [periodKey, setPeriodKey] = useState<PeriodKey>("q1");
  const [customFromDate, setCustomFromDate] = useState(`${CURRENT_YEAR}-01-01`);
  const [customToDate, setCustomToDate] = useState(`${CURRENT_YEAR}-12-31`);
  const [exportBookScope, setExportBookScope] = useState<ExportBookScope>("business");
  const displayCompanyName = normalizeCompanyName(companyName);
  const [companyDraft, setCompanyDraft] = useState(displayCompanyName);
  const [companyEditing, setCompanyEditing] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<EditableCategoryType, number>>({
    income: 0,
    expense: 0,
  });
  const currentBookLabel =
    BOOK_OPTIONS.find((book) => book.value === currentBookId)?.label ?? "Τρέχον book";

  const selectedPeriod = useMemo(
    () => resolveExportPeriod(periodKey, customFromDate, customToDate, quarterPeriods),
    [customFromDate, customToDate, periodKey, quarterPeriods],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadUpdaterTokenState() {
      try {
        const hasToken = await hasUpdaterGitHubToken();
        if (!cancelled) setGithubTokenSaved(hasToken);
      } catch (err) {
        console.error("Failed to load updater token state:", err);
      }
    }

    void loadUpdaterTokenState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLastAutoBackup() {
      try {
        const value = await getLastAutoBackupAt();
        if (!cancelled) setLastAutoBackupAt(value);
      } catch (err) {
        console.error("Failed to load auto-backup state:", err);
      }
    }

    void loadLastAutoBackup();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!companyEditing) setCompanyDraft(displayCompanyName);
  }, [companyEditing, displayCompanyName]);

  useEffect(() => {
    let cancelled = false;

    async function loadCategoryCounts() {
      try {
        const counts = await listCategoryCounts(currentBookId);
        if (!cancelled) setCategoryCounts(counts);
      } catch (err) {
        console.error("Failed to load category counts:", err);
      }
    }

    void loadCategoryCounts();
    return () => {
      cancelled = true;
    };
  }, [currentBookId]);

  function handleSaveCompanyName() {
    const nextCompanyName = normalizeCompanyName(companyDraft);
    setCompanyName(nextCompanyName);
    setCompanyDraft(nextCompanyName);
    setCompanyEditing(false);
  }

  function handleCancelCompanyName() {
    setCompanyDraft(displayCompanyName);
    setCompanyEditing(false);
  }

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
      const result = await createJsonBackup({ directoryPath: backupDirectory });
      setBackupMessage(`Δημιουργήθηκε backup: ${result.path}`);
    } catch (err) {
      console.error("Backup failed:", err);
      setBackupMessage(`Δεν δημιουργήθηκε backup: ${messageFromError(err)}`);
    } finally {
      setBackupRunning(false);
    }
  }

  async function handleChooseBackupDirectory() {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
        defaultPath: backupDirectory ?? (await getDefaultBackupDirectory()),
      });

      if (!selected || Array.isArray(selected)) return;

      setBackupDirectory(selected);
      setBackupMessage(`Ο φάκελος backup ορίστηκε: ${selected}`);
    } catch (err) {
      console.error("Choose backup directory failed:", err);
      setBackupMessage(`Δεν ορίστηκε φάκελος backup: ${messageFromError(err)}`);
    }
  }

  function handleClearBackupDirectory() {
    setBackupDirectory(null);
    setBackupMessage("Ο φάκελος backup γύρισε στην προεπιλογή Documents/Evochia_Backups.");
  }

  async function handleGoogleDriveBackup() {
    if (driveBackupRunning) return;

    setDriveBackupRunning(true);
    setBackupMessage("");

    try {
      const defaultPath = await join(
        backupDirectory ?? (await getDefaultBackupDirectory()),
        createBackupFileName(),
      );
      const path = await save({
        defaultPath,
        filters: [{ name: "Evochia Finance backup", extensions: ["json"] }],
      });

      if (!path) {
        setBackupMessage("Το backup σε Google Drive ακυρώθηκε.");
        return;
      }

      const result = await saveJsonBackupToPath(path);
      setBackupMessage(`Αποθηκεύτηκε backup: ${result.path}`);
    } catch (err) {
      console.error("Google Drive backup failed:", err);
      setBackupMessage(`Δεν αποθηκεύτηκε backup σε Google Drive: ${messageFromError(err)}`);
    } finally {
      setDriveBackupRunning(false);
    }
  }

  async function handleRestoreBackup() {
    if (restoreRunning) return;

    setRestoreRunning(true);
    setBackupMessage("");

    try {
      const backupDir = await join(await documentDir(), "Evochia_Backups");
      const selected = await open({
        multiple: false,
        directory: false,
        defaultPath: backupDir,
        filters: [{ name: "Evochia Finance backup", extensions: ["json"] }],
      });

      if (!selected || Array.isArray(selected)) {
        setBackupMessage("Η επαναφορά ακυρώθηκε.");
        return;
      }

      const confirmed = window.confirm(
        "Προσοχή: η επαναφορά θα αντικαταστήσει ΟΛΑ τα τοπικά δεδομένα. Συνέχεια;",
      );
      if (!confirmed) {
        setBackupMessage("Η επαναφορά ακυρώθηκε.");
        return;
      }

      const result = await restoreFromBackupPath(selected);
      setBackupMessage(
        `Η επαναφορά ολοκληρώθηκε: ${result.rowsRestored} εγγραφές σε ${result.tablesRestored} πίνακες. Η εφαρμογή θα ανανεωθεί.`,
      );
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("Restore backup failed:", err);
      setBackupMessage(`Δεν έγινε επαναφορά: ${messageFromError(err)}`);
    } finally {
      setRestoreRunning(false);
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

  async function handleUpdateCheck() {
    if (checkingUpdate) return;

    setCheckingUpdate(true);
    setUpdateMessage("");

    try {
      const result = await checkForUpdate();
      setUpdateMessage(result.message);
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function handleSaveGithubToken() {
    if (savingGithubToken) return;

    const token = githubTokenDraft.trim();
    if (!token) {
      setGithubTokenMessage("Βάλε ένα GitHub token ή καθάρισε το αποθηκευμένο token.");
      return;
    }

    setSavingGithubToken(true);
    setGithubTokenMessage("");

    try {
      await setUpdaterGitHubToken(token);
      setGithubTokenDraft("");
      setGithubTokenSaved(true);
      setGithubTokenMessage("Το updater token αποθηκεύτηκε τοπικά.");
    } catch (err) {
      console.error("Failed to save updater token:", err);
      setGithubTokenMessage("Δεν αποθηκεύτηκε το updater token.");
    } finally {
      setSavingGithubToken(false);
    }
  }

  async function handleClearGithubToken() {
    if (savingGithubToken) return;

    setSavingGithubToken(true);
    setGithubTokenMessage("");

    try {
      await clearUpdaterGitHubToken();
      setGithubTokenDraft("");
      setGithubTokenSaved(false);
      setGithubTokenMessage("Το updater token διαγράφηκε από την τοπική αποθήκευση.");
    } catch (err) {
      console.error("Failed to clear updater token:", err);
      setGithubTokenMessage("Δεν διαγράφηκε το updater token.");
    } finally {
      setSavingGithubToken(false);
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-h1">Ρυθμίσεις</h1>
        <p className="text-caption mt-1">Λογαριασμός, ασφάλεια, συγχρονισμός και export</p>
      </div>

      <AccountSection
        userEmail={user?.email}
        deletingAccount={deletingAccount}
        accountMessage={accountMessage}
        onSignOut={handleSignOut}
        onDeleteAccount={handleDeleteAccount}
      />

      <BusinessSection
        companyDraft={companyDraft}
        companyEditing={companyEditing}
        displayCompanyName={displayCompanyName}
        onCancel={handleCancelCompanyName}
        onDraftChange={setCompanyDraft}
        onEdit={() => setCompanyEditing(true)}
        onSave={handleSaveCompanyName}
      />

      <CategoriesSection categoryCounts={categoryCounts} currentBookLabel={currentBookLabel} />

      <MfaSettingsPanel />

      <SyncSection
        lastSyncedAt={lastSyncedAt}
        manualSyncing={manualSyncing}
        pendingCount={pendingCount}
        syncMessage={syncMessage}
        syncState={syncState}
        onManualSync={handleManualSync}
        onResetSync={handleResetSync}
      />

      <BackupSection
        autoBackupEnabled={autoBackupEnabled}
        backupDirectory={backupDirectory}
        backupMessage={backupMessage}
        backupRunning={backupRunning}
        driveBackupRunning={driveBackupRunning}
        lastAutoBackupAt={lastAutoBackupAt}
        restoreRunning={restoreRunning}
        onBackup={handleBackup}
        onAutoBackupChange={setAutoBackupEnabled}
        onChooseBackupDirectory={handleChooseBackupDirectory}
        onClearBackupDirectory={handleClearBackupDirectory}
        onGoogleDriveBackup={handleGoogleDriveBackup}
        onRestore={handleRestoreBackup}
      />

      <ExportSection
        customFromDate={customFromDate}
        customToDate={customToDate}
        exportBookOptions={EXPORT_BOOK_OPTIONS}
        exportBookScope={exportBookScope}
        exportMessage={exportMessage}
        exportRunning={exportRunning}
        periodKey={periodKey}
        quarterPeriods={quarterPeriods}
        onCustomFromDateChange={setCustomFromDate}
        onCustomToDateChange={setCustomToDate}
        onExport={handleExport}
        onExportBookScopeChange={setExportBookScope}
        onPeriodKeyChange={(value) => setPeriodKey(value as PeriodKey)}
      />

      <PreferencesSection
        bookOptions={BOOK_OPTIONS}
        currentBookId={currentBookId}
        defaultPaymentMethod={defaultPaymentMethod}
        defaultVatRate={defaultVatRate}
        paymentMethods={PAYMENT_METHODS}
        vatRates={VAT_RATES}
        onCurrentBookIdChange={setCurrentBookId}
        onDefaultPaymentMethodChange={setDefaultPaymentMethod}
        onDefaultVatRateChange={setDefaultVatRate}
      />

      <AboutSection
        appVersion={APP_VERSION}
        checkingUpdate={checkingUpdate}
        displayCompanyName={displayCompanyName}
        githubTokenDraft={githubTokenDraft}
        githubTokenMessage={githubTokenMessage}
        githubTokenSaved={githubTokenSaved}
        savingGithubToken={savingGithubToken}
        updateMessage={updateMessage}
        onClearGithubToken={handleClearGithubToken}
        onGithubTokenDraftChange={setGithubTokenDraft}
        onSaveGithubToken={handleSaveGithubToken}
        onUpdateCheck={handleUpdateCheck}
      />
    </div>
  );
}
