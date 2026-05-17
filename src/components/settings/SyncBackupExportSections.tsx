import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExportBookScope, ExportPeriod } from "@/lib/export";
import { formatDateRelative } from "@/lib/utils";
import {
  CloudUpload,
  DatabaseBackup,
  FileSpreadsheet,
  FolderOpen,
  RefreshCcw,
  RotateCw,
  Upload,
  X,
} from "lucide-react";

type Option<T extends string | number> = { label: string; value: T };

function sectionClassName(extra = ""): string {
  return `bg-cream border border-border-light rounded-md p-4 ${extra}`;
}

interface SyncSectionProps {
  lastSyncedAt: string | null;
  manualSyncing: boolean;
  pendingCount: number;
  syncMessage: string;
  syncState: string;
  onManualSync: () => void;
  onResetSync: () => void;
}

export function SyncSection({
  lastSyncedAt,
  manualSyncing,
  pendingCount,
  syncMessage,
  syncState,
  onManualSync,
  onResetSync,
}: SyncSectionProps) {
  return (
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
          onClick={onManualSync}
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
          onClick={onResetSync}
          className="inline-flex items-center gap-2 text-text-secondary text-sm font-medium hover:underline"
        >
          <RefreshCcw className="w-4 h-4" strokeWidth={1.7} />
          Reset sync state
        </button>
      </div>
      {syncMessage ? <p className="text-caption mt-3">{syncMessage}</p> : null}
    </section>
  );
}

interface BackupSectionProps {
  autoBackupEnabled: boolean;
  backupDirectory: string | null;
  backupMessage: string;
  backupRunning: boolean;
  driveBackupRunning: boolean;
  lastAutoBackupAt: string | null;
  restoreRunning: boolean;
  onBackup: () => void;
  onAutoBackupChange: (enabled: boolean) => void;
  onChooseBackupDirectory: () => void;
  onClearBackupDirectory: () => void;
  onGoogleDriveBackup: () => void;
  onRestore: () => void;
}

export function BackupSection({
  autoBackupEnabled,
  backupDirectory,
  backupMessage,
  backupRunning,
  driveBackupRunning,
  lastAutoBackupAt,
  restoreRunning,
  onBackup,
  onAutoBackupChange,
  onChooseBackupDirectory,
  onClearBackupDirectory,
  onGoogleDriveBackup,
  onRestore,
}: BackupSectionProps) {
  const backupDirectoryLabel = backupDirectory ?? "Documents/Rheo_Backups";
  const backupDirectoryState = backupDirectory
    ? "Προσαρμοσμένος φάκελος"
    : "Προεπιλεγμένος φάκελος";

  return (
    <section className={sectionClassName()}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-h3">Backup</h2>
          <p className="text-caption mt-1">
            JSON snapshot σε τοπικό φάκελο ή σε Google Drive μέσω native picker.
          </p>
        </div>
        <DatabaseBackup className="w-5 h-5 text-gold" strokeWidth={1.7} />
      </div>
      <div className="mb-3 rounded-md border border-border-light bg-sand px-3 py-2.5">
        <p className="text-caption text-text-muted">{backupDirectoryState}</p>
        <p className="mt-1 break-words text-xs leading-relaxed text-text-primary">
          {backupDirectoryLabel}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onChooseBackupDirectory}
          className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-medium text-charcoal"
        >
          <FolderOpen className="w-4 h-4" strokeWidth={1.7} />
          Επιλογή φακέλου
        </button>
        {backupDirectory ? (
          <button
            type="button"
            onClick={onClearBackupDirectory}
            className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-medium text-text-secondary"
          >
            <X className="w-4 h-4" strokeWidth={1.7} />
            Προεπιλογή
          </button>
        ) : null}
        <button
          type="button"
          onClick={onBackup}
          disabled={backupRunning}
          className="inline-flex items-center gap-2 rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-text-on-dark disabled:opacity-50"
        >
          <DatabaseBackup className="w-4 h-4" strokeWidth={1.7} />
          {backupRunning ? "Backup..." : "Δημιουργία backup"}
        </button>
        <button
          type="button"
          onClick={onGoogleDriveBackup}
          disabled={driveBackupRunning}
          className="inline-flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-medium text-charcoal disabled:opacity-50"
        >
          <CloudUpload className="w-4 h-4" strokeWidth={1.7} />
          {driveBackupRunning ? "Αποθήκευση..." : "Backup σε Google Drive"}
        </button>
        <button
          type="button"
          onClick={onRestore}
          disabled={restoreRunning}
          className="inline-flex items-center gap-2 rounded-md border border-border-light px-3 py-2 text-sm font-medium text-charcoal disabled:opacity-50"
        >
          <Upload className="w-4 h-4" strokeWidth={1.7} />
          {restoreRunning ? "Επαναφορά..." : "Επαναφορά από backup"}
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={autoBackupEnabled}
            onChange={(event) => onAutoBackupChange(event.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          Εβδομαδιαίο auto-backup
        </label>
      </div>
      {backupMessage ? <p className="text-caption mt-3 break-all">{backupMessage}</p> : null}
      {autoBackupEnabled ? (
        <p className="text-caption mt-3 text-text-muted">
          Τελευταίο auto-backup:{" "}
          {lastAutoBackupAt ? formatDateRelative(lastAutoBackupAt) : "δεν έχει τρέξει ακόμα"}
        </p>
      ) : null}
      <p className="text-caption mt-3 text-text-muted">
        Η επαναφορά αντικαθιστά τα τοπικά δεδομένα μετά από επιβεβαίωση.
      </p>
    </section>
  );
}

interface ExportSectionProps {
  customFromDate: string;
  customToDate: string;
  exportBookOptions: Array<Option<ExportBookScope>>;
  exportBookScope: ExportBookScope;
  exportMessage: string;
  exportRunning: boolean;
  periodKey: string;
  quarterPeriods: ExportPeriod[];
  onCustomFromDateChange: (value: string) => void;
  onCustomToDateChange: (value: string) => void;
  onExport: () => void;
  onExportBookScopeChange: (value: ExportBookScope) => void;
  onPeriodKeyChange: (value: string) => void;
}

export function ExportSection({
  customFromDate,
  customToDate,
  exportBookOptions,
  exportBookScope,
  exportMessage,
  exportRunning,
  periodKey,
  quarterPeriods,
  onCustomFromDateChange,
  onCustomToDateChange,
  onExport,
  onExportBookScopeChange,
  onPeriodKeyChange,
}: ExportSectionProps) {
  return (
    <section className={sectionClassName()}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-h3">Export</h2>
          <p className="text-caption mt-1">Excel για λογιστή με συναλλαγές, ΦΠΑ και κατηγορίες.</p>
        </div>
        <FileSpreadsheet className="w-5 h-5 text-gold" strokeWidth={1.7} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="form-label" htmlFor="export-period">
            Περίοδος
          </label>
          <Select value={periodKey} onValueChange={onPeriodKeyChange}>
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
            onValueChange={(value) => onExportBookScopeChange(value as ExportBookScope)}
          >
            <SelectTrigger id="export-book" className="bg-cream border-border-light">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {exportBookOptions.map((option) => (
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
            onClick={onExport}
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
              onChange={(event) => onCustomFromDateChange(event.target.value)}
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
              onChange={(event) => onCustomToDateChange(event.target.value)}
              className="w-full bg-cream border border-border-light rounded-md text-sm px-3 py-2.5 focus:outline-none focus:border-charcoal"
            />
          </div>
        </div>
      ) : null}

      {exportMessage ? <p className="text-caption mt-3">{exportMessage}</p> : null}
    </section>
  );
}
