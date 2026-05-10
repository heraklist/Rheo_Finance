import { MfaSettingsPanel } from "@/components/auth/MfaSettingsPanel";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { getPendingCount, syncAll } from "@/lib/sync";
import { formatDateRelative } from "@/lib/utils";
import { LogOut, RotateCw } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Settings() {
  const {
    user,
    syncState,
    lastSyncedAt,
    pendingCount,
    setLastSyncedAt,
    setMfaStatus,
    setPendingCount,
    setSyncState,
  } = useAppStore();
  const navigate = useNavigate();
  const [manualSyncing, setManualSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out:", error);
      return;
    }

    setMfaStatus(false, false);
    navigate("/login");
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

  return (
    <div className="px-4 py-6 space-y-6">
      <div>
        <h1 className="text-h1">Ρυθμίσεις</h1>
        <p className="text-caption mt-1">Λογαριασμός, ασφάλεια και συγχρονισμός</p>
      </div>

      <section className="bg-cream border border-border-light rounded-md p-4">
        <h2 className="text-h3 mb-2">Λογαριασμός</h2>
        <p className="text-text-muted text-sm mb-4">{user?.email ?? "Συνδεδεμένος χρήστης"}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 text-expense text-sm font-medium hover:underline"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.7} />
          Αποσύνδεση
        </button>
      </section>

      <MfaSettingsPanel />

      <section className="bg-cream border border-border-light rounded-md p-4">
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
          {manualSyncing ? "Συγχρονισμός…" : "Συγχρονισμός τώρα"}
        </button>
        {syncMessage ? <p className="text-caption mt-3">{syncMessage}</p> : null}
      </section>

      <p className="text-caption">
        Περισσότερες ρυθμίσεις σύντομα: backup, export και sync settings.
      </p>
    </div>
  );
}
