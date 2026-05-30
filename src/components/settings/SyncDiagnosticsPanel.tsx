import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSyncDiagnostics,
  MAX_RETRYABLE_SYNC_ATTEMPTS,
  type SyncDiagnostics,
} from "@/lib/syncDiagnostics";
import { formatDateRelative } from "@/lib/utils";

interface SyncDiagnosticsPanelProps {
  pendingCount: number;
  syncState: string;
}

function issueLabel(entityType: string, operation: string): string {
  return `${operation} ${entityType}`;
}

function issueToneClass(attempts: number): string {
  return attempts >= MAX_RETRYABLE_SYNC_ATTEMPTS
    ? "border-red-200 bg-red-50 text-red-950"
    : "border-amber-200 bg-amber-50 text-amber-950";
}

export function SyncDiagnosticsPanel({ pendingCount, syncState }: SyncDiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshDiagnostics() {
    setLoading(true);
    setMessage("");

    try {
      setDiagnostics(await getSyncDiagnostics());
    } catch (error) {
      console.error("Failed to load sync diagnostics:", error);
      setMessage("Δεν φορτώθηκαν τα διαγνωστικά συγχρονισμού.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function loadDiagnostics() {
      try {
        setDiagnostics(await getSyncDiagnostics());
      } catch (error) {
        console.error("Failed to load sync diagnostics:", error);
        setMessage("Δεν φορτώθηκαν τα διαγνωστικά συγχρονισμού.");
      }
    }

    void loadDiagnostics();
  }, []);

  if (!diagnostics || diagnostics.pendingCount === 0) {
    return null;
  }

  return (
    <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
      <span className="sr-only">
        Sync status: {syncState}, pending items: {pendingCount}
      </span>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-950">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.7} />
            Διαγνωστικά συγχρονισμού
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            Υπάρχουν εγγραφές που περιμένουν retry ή χρειάζονται έλεγχο.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshDiagnostics()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-950 hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Ανανέωση
        </button>
      </div>

      <div className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded border border-amber-200 bg-white/60 px-3 py-2">
          <div className="text-amber-800">Εκκρεμούν</div>
          <div className="text-base font-semibold text-amber-950">{diagnostics.pendingCount}</div>
        </div>
        <div className="rounded border border-amber-200 bg-white/60 px-3 py-2">
          <div className="text-amber-800">Retryable</div>
          <div className="text-base font-semibold text-amber-950">{diagnostics.retryableCount}</div>
        </div>
        <div className="rounded border border-red-200 bg-white/60 px-3 py-2">
          <div className="text-red-800">Stuck ≥ {MAX_RETRYABLE_SYNC_ATTEMPTS}</div>
          <div className="text-base font-semibold text-red-950">{diagnostics.stuckCount}</div>
        </div>
      </div>

      <div className="space-y-2">
        {diagnostics.issues.map((issue) => (
          <article
            key={issue.id}
            className={`rounded border px-3 py-2 ${issueToneClass(issue.attempts)}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
              <span>{issueLabel(issue.entityType, issue.operation)}</span>
              <span>{issue.attempts} attempts</span>
            </div>
            <div className="mt-1 break-all text-xs opacity-80">ID: {issue.entityId}</div>
            {issue.lastError ? (
              <div className="mt-1 break-words text-xs">Σφάλμα: {issue.lastError}</div>
            ) : null}
            <div className="mt-1 text-xs opacity-75">
              Δημιουργήθηκε: {formatDateRelative(issue.createdAt)}
            </div>
          </article>
        ))}
      </div>

      {message ? <p className="mt-3 text-xs text-red-800">{message}</p> : null}
    </section>
  );
}
