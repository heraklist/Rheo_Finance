# Session 006 — Sync engine (Option A: outbox + LWW)

> Prerequisite: Session 005 complete. Auth works. Schema applied σε Supabase. Heraklis έχει sign-in.

---

## Σκοπός

Wire-up το sync layer μεταξύ local SQLite και Supabase Postgres. Single-user, last-write-wins, outbox pattern. Δες project plan v1.1 Section 6 για full design.

---

## Expected outputs

1. **`src/lib/sync.ts`** με `pullChanges()`, `pushChanges()`, `syncAll()`
2. **Background sync worker** — interval polling κάθε 30s όταν online
3. **SyncPill** wired σε real state (όχι static "synced" πλέον)
4. **Manual "Sync now"** button στο Settings
5. **First successful sync** των test transactions από local σε Supabase
6. Test ότι row σε Supabase εμφανίζεται μετά από local create

---

## Key design points (από project plan)

- **Push first, then pull** σε κάθε sync cycle
- **Outbox table** ήδη populated από Sessions 002-003 — ο sync engine απλά reads + replays
- **Pull**: `SELECT * FROM <table> WHERE updated_at > last_synced_at AND user_id = auth.uid()`
- **Conflict resolution**: σπάνια σε single-user, last-write-wins με `local_updated_at`
- **Photo sync**: αρχικά skip — receipt photos σύγχρονα μένουν local, Session 007 χειρίζεται upload

---

## Prompt για Claude Code

````
Sync engine wire-up. Διάβασε CLAUDE.md, project plan v1.1 Section 6 (Sync Strategy),
src/lib/db.ts, src/lib/transactions.ts. Πες μία γραμμή πώς θα δομήσεις το sync.

5 checkpoints. Stop on broken state.

═════════════════════════════════════════════════════════
CHECKPOINT 1: src/lib/sync.ts skeleton
═════════════════════════════════════════════════════════

Δημιούργησε `src/lib/sync.ts`:

```ts
import { getDb, now } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

interface OutboxEntry {
  id: number;
  entity_type: string;
  entity_id: string;
  operation: "create" | "update" | "delete";
  payload: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

const ENTITY_TABLES: Record<string, string> = {
  transaction: "transactions",
  tag: "tags",
  category: "categories",
  account: "accounts",
  book: "books",
  recurring_template: "recurring_templates",
};

/**
 * Push pending changes from outbox to Supabase.
 * Returns count of successful pushes.
 */
export async function pushChanges(): Promise<number> {
  const db = await getDb();
  const user = useAppStore.getState().user;
  if (!user) return 0;

  const entries = await db.select<OutboxEntry[]>(
    "SELECT * FROM sync_outbox ORDER BY created_at ASC LIMIT 50",
  );

  let success = 0;
  for (const entry of entries) {
    try {
      const table = ENTITY_TABLES[entry.entity_type];
      if (!table) {
        console.error(`Unknown entity type: ${entry.entity_type}`);
        continue;
      }
      const payload = JSON.parse(entry.payload);
      payload.user_id = user.id;  // Tag with current user

      if (entry.operation === "create" || entry.operation === "update") {
        const { error } = await supabase.from(table).upsert(payload);
        if (error) throw error;
      } else if (entry.operation === "delete") {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("id", entry.entity_id);
        if (error) throw error;
      }

      // Success — remove from outbox + mark synced
      await db.execute("DELETE FROM sync_outbox WHERE id = ?", [entry.id]);
      const tableName = ENTITY_TABLES[entry.entity_type]!;
      if (entry.operation !== "delete") {
        await db.execute(
          `UPDATE ${tableName} SET sync_status = 'synced', server_updated_at = ? WHERE id = ?`,
          [now(), entry.entity_id],
        );
      }
      success++;
    } catch (err) {
      // Increment attempts + record error
      const msg = err instanceof Error ? err.message : String(err);
      await db.execute(
        "UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?",
        [msg, entry.id],
      );
      console.error(`Push failed for ${entry.entity_type} ${entry.entity_id}:`, err);
    }
  }
  return success;
}

/**
 * Pull remote changes since last_synced_at.
 * Returns count of pulled rows.
 */
export async function pullChanges(): Promise<number> {
  const db = await getDb();
  const user = useAppStore.getState().user;
  if (!user) return 0;

  // Get last sync timestamp
  const meta = await db.select<{ value: string }[]>(
    "SELECT value FROM sync_metadata WHERE key = 'last_synced_at' LIMIT 1",
  );
  const lastSync = meta[0]?.value || "1970-01-01T00:00:00Z";

  let total = 0;
  for (const [, table] of Object.entries(ENTITY_TABLES)) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .gt("updated_at", lastSync);

    if (error) {
      console.error(`Pull failed for ${table}:`, error);
      continue;
    }

    for (const row of data ?? []) {
      // INSERT OR REPLACE pattern
      const cols = Object.keys(row);
      const placeholders = cols.map(() => "?").join(", ");
      const values = cols.map((c) => row[c]);
      await db.execute(
        `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}, sync_status, local_updated_at)
         VALUES (${placeholders}, 'synced', ?)`,
        [...values, now()],
      );
      total++;
    }
  }

  // Update last_synced_at
  await db.execute(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
     VALUES ('last_synced_at', ?, ?)`,
    [now(), now()],
  );

  return total;
}

/**
 * Combined sync: push then pull.
 * Returns { pushed, pulled }.
 */
export async function syncAll(): Promise<{ pushed: number; pulled: number }> {
  const pushed = await pushChanges();
  const pulled = await pullChanges();
  return { pushed, pulled };
}
```

`pnpm typecheck` clean.

**Report:** sync.ts created, exports verified.

═════════════════════════════════════════════════════════
CHECKPOINT 2: Sync state σε Zustand store
═════════════════════════════════════════════════════════

Επέκτεινε `src/lib/store.ts`:

```ts
type SyncState = "synced" | "syncing" | "offline" | "error";

interface AppState {
  // existing...
  syncState: SyncState;
  lastSyncedAt: string | null;
  pendingCount: number;
  setSyncState: (s: SyncState) => void;
  setLastSyncedAt: (ts: string | null) => void;
  setPendingCount: (n: number) => void;
}
```

Implement το extension στο store.

**Report:** store extended.

═════════════════════════════════════════════════════════
CHECKPOINT 3: Background sync worker
═════════════════════════════════════════════════════════

Δημιούργησε `src/hooks/useSyncWorker.ts`:

```ts
import { useEffect } from "react";
import { syncAll } from "@/lib/sync";
import { useAppStore } from "@/lib/store";
import { getDb } from "@/lib/db";

const SYNC_INTERVAL_MS = 30_000;

export function useSyncWorker() {
  const { user, setSyncState, setLastSyncedAt, setPendingCount } = useAppStore();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let intervalId: number | null = null;

    async function syncOnce() {
      if (cancelled || !navigator.onLine) {
        if (!navigator.onLine) setSyncState("offline");
        return;
      }
      setSyncState("syncing");
      try {
        await syncAll();
        if (!cancelled) {
          setSyncState("synced");
          setLastSyncedAt(new Date().toISOString());

          // Update pending count
          const db = await getDb();
          const result = await db.select<{ count: number }[]>(
            "SELECT COUNT(*) as count FROM sync_outbox",
          );
          setPendingCount(result[0]?.count ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Sync failed:", err);
          setSyncState("error");
        }
      }
    }

    // Initial sync
    void syncOnce();

    // Repeat every 30s
    intervalId = window.setInterval(syncOnce, SYNC_INTERVAL_MS);

    // Online/offline events
    const handleOnline = () => void syncOnce();
    const handleOffline = () => setSyncState("offline");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user, setSyncState, setLastSyncedAt, setPendingCount]);
}
```

Καλέσε το `useSyncWorker()` στο `AppLayout.tsx` (ή `App.tsx`).

**Report:** worker registered, runs without errors on app launch.

═════════════════════════════════════════════════════════
CHECKPOINT 4: Wire SyncPill σε real state + manual sync button
═════════════════════════════════════════════════════════

A) Update `src/components/layout/AppLayout.tsx`:
```tsx
const { syncState, pendingCount } = useAppStore();
// ...
<SyncPill status={syncState} pendingCount={pendingCount} />
```

B) Update `src/pages/Settings.tsx` με sync section:
```tsx
import { syncAll } from "@/lib/sync";
import { formatDateRelative } from "@/lib/utils";

// μέσα στο component:
const { syncState, lastSyncedAt, pendingCount } = useAppStore();
const [manualSyncing, setManualSyncing] = useState(false);

async function handleManualSync() {
  setManualSyncing(true);
  try {
    const result = await syncAll();
    alert(`Συγχρονίστηκαν: ${result.pushed} push, ${result.pulled} pull`);
  } catch (err) {
    alert(`Σφάλμα: ${err instanceof Error ? err.message : "Unknown"}`);
  } finally {
    setManualSyncing(false);
  }
}

// Νέο section:
<section className="bg-cream border border-border-light rounded-md p-4">
  <h2 className="text-h3 mb-2">Συγχρονισμός</h2>
  <div className="space-y-1.5 text-sm text-text-muted mb-3">
    <div>Κατάσταση: <span className="text-text-primary">{syncState}</span></div>
    {lastSyncedAt && <div>Τελευταίος συγχρονισμός: {formatDateRelative(lastSyncedAt)}</div>}
    {pendingCount > 0 && <div>Εκκρεμούν: {pendingCount} αλλαγές</div>}
  </div>
  <button
    onClick={handleManualSync}
    disabled={manualSyncing}
    className="text-gold text-sm font-medium hover:underline disabled:opacity-50"
  >
    {manualSyncing ? "Συγχρονισμός…" : "Συγχρονισμός τώρα"}
  </button>
</section>
```

**Report:** SyncPill δείχνει real states, Settings έχει sync info.

═════════════════════════════════════════════════════════
CHECKPOINT 5: Manual end-to-end test
═════════════════════════════════════════════════════════

1. Sign in, καταχώρησε 2 test transactions
2. Δες SyncPill: "Συγχρονισμός…" → "Ενημερωμένο"
3. Στο Supabase dashboard → Table Editor → transactions: επιβεβαίωσε ότι οι 2 rows εμφανίζονται με σωστό user_id
4. Disconnect internet → καταχώρησε 1 ακόμα transaction
5. SyncPill: "Offline · 1 αλλαγή"
6. Reconnect → αυτόματο sync → "Ενημερωμένο"
7. Settings → "Συγχρονισμός τώρα" → δείχνει counts

```bash
git add -A
git commit -m "feat(sync): outbox-based sync engine με push/pull cycles

- Implement src/lib/sync.ts with pushChanges, pullChanges, syncAll
- Background sync worker via useSyncWorker hook (30s interval)
- Wire SyncPill to real state in store
- Online/offline event handling
- Manual 'Sync now' in Settings
- pendingCount + lastSyncedAt tracking

Phase 2 milestone — cloud sync working bi-directionally."
git push
```
````
