# Session 005 — Supabase setup + Auth (Phase 2 entry)

> Prerequisite: Sessions 002-004 complete. **Heraklis πρέπει να έχει**: Supabase project URL + anon key + service_role key.

---

## Σκοπός

Έναρξη Phase 2: Cloud-side. Heraklis δημιουργεί Supabase project, εφαρμόζουμε ίδιο schema, κάνουμε wire-up auth flow στο app. Sync engine έρχεται στο 006.

---

## Pre-session — δουλειά Heraklis (~30 min)

**Πριν δώσει το prompt στο Claude Code:**

1. **Supabase project**:
   - [supabase.com](https://supabase.com) → New Project
   - Name: `evochia-finance`
   - Region: **Frankfurt (eu-central-1)** ⚠️ critical για GDPR
   - Strong DB password → password manager
   - Wait ~2 minutes για provision

2. **Πάρε credentials** (Project Settings → API):
   - Project URL: `https://xxxxx.supabase.co`
   - `anon` public key (safe to commit)
   - `service_role` secret key (NEVER commit, NEVER δίνεις στο agent)

3. **Δημιούργησε `.env.local` στο project root**:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```
   (`.env.local` ήδη στο .gitignore από session 002)

4. **Verify 2FA** σε Supabase + GitHub + email

---

## Expected outputs μετά το session

1. Supabase Postgres έχει το ίδιο schema με local SQLite + RLS policies
2. `@supabase/supabase-js` installed + configured client
3. **Login page** (`/login`) με magic link form
4. **Auth state** σε Zustand store (user, session, loading)
5. **Protected routes** — όλα εκτός `/login` redirect αν δεν υπάρχει session
6. **Sign out** στο Settings (νέα minimal Settings page)
7. Manual test: sign in με email, magic link σε inbox, click → επιστρέφει signed in

---

## Prompt για Claude Code

````
Phase 2 entry: Supabase setup + auth flow.

PREREQUISITE CHECK: 
- Verify .env.local υπάρχει με VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
- Αν δεν υπάρχει, σταμάτα και ζήτα από Heraklis

Διάβασε CLAUDE.md, project plan Section 9 (Security), CODEX_HANDOFF.md
Priority 3 (Auth). Πες μία γραμμή τι κατάλαβες.

7 checkpoints. Stop on broken state.

═════════════════════════════════════════════════════════
CHECKPOINT 1: Apply schema σε Supabase Postgres
═════════════════════════════════════════════════════════

ΕΠΕΙΔΗ δεν έχεις access στο Supabase dashboard, **παράγαγε SQL αρχεία** που
ο Heraklis θα τρέξει στο Supabase SQL Editor.

Δημιούργησε `supabase/migrations/001_schema.sql`:
- Όμοιο με `src-tauri/migrations/0001_initial.sql` αλλά:
  - PostgreSQL syntax (UUID αντί TEXT, generated columns για VAT/net)
  - Foreign key references σε `auth.users(id)` για user_id
  - Επιπλέον στήλη `user_id UUID NOT NULL REFERENCES auth.users(id)` σε ΟΛΑ τα tables
  - Generated VAT/net σε Postgres (αντί για application-computed):
    ```sql
    amount_vat NUMERIC(12,2) GENERATED ALWAYS AS
      (amount_gross - amount_gross / (1 + vat_rate)) STORED,
    amount_net NUMERIC(12,2) GENERATED ALWAYS AS
      (amount_gross / (1 + vat_rate)) STORED,
    ```

Δημιούργησε `supabase/migrations/002_rls_policies.sql`:
- Enable RLS σε ΟΛΟΥΣ τους tables
- Standard policies (replicate per table):
  ```sql
  ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  
  CREATE POLICY "users_select_own" ON transactions
    FOR SELECT USING (auth.uid() = user_id);
  CREATE POLICY "users_insert_own" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "users_update_own" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);
  CREATE POLICY "users_delete_own" ON transactions
    FOR DELETE USING (auth.uid() = user_id);
  ```

Δημιούργησε `supabase/README.md` με instructions για Heraklis:
1. Open Supabase project → SQL Editor → New query
2. Paste 001_schema.sql → Run
3. Paste 002_rls_policies.sql → Run
4. Verify: Table Editor δείχνει 6 tables με RLS enabled

**Report:** files created, content summary.
**Stop here** και ζήτα από Heraklis να εκτελέσει manually πριν συνεχίσεις.

═════════════════════════════════════════════════════════
CHECKPOINT 2: Install + configure Supabase client
═════════════════════════════════════════════════════════

```bash
pnpm add @supabase/supabase-js
```

Δημιούργησε `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,  // για magic link callback
  },
});
```

Update `src/lib/types.ts` — όλα τα entities να έχουν optional `user_id?: string`
(για το cloud-side schema).

`pnpm typecheck` clean.

**Report:** client configured.

═════════════════════════════════════════════════════════
CHECKPOINT 3: Auth state store
═════════════════════════════════════════════════════════

Επέκτεινε `src/lib/store.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";

interface AppState {
  // Existing
  currentBookId: string;
  setCurrentBookId: (id: string) => void;
  // === ΝΕΑ: auth ===
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentBookId: "book-business",
      setCurrentBookId: (id) => set({ currentBookId: id }),
      user: null,
      session: null,
      authLoading: true,
      setAuth: (user, session) => set({ user, session, authLoading: false }),
      setAuthLoading: (loading) => set({ authLoading: loading }),
    }),
    {
      name: "evochia-app-state",
      partialize: (state) => ({ currentBookId: state.currentBookId }),
      // ΟΧΙ persist auth state — Supabase τα χειρίζεται
    },
  ),
);
```

**Report:** store extended.

═════════════════════════════════════════════════════════
CHECKPOINT 4: Auth bootstrap στο App.tsx
═════════════════════════════════════════════════════════

Στο `src/App.tsx`, πρόσθεσε useEffect που initialize-άρει auth listener:

```tsx
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

export function App() {
  const { setAuth, setAuthLoading } = useAppStore();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session?.user ?? null, data.session);
    });

    // Listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth(session?.user ?? null, session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setAuth, setAuthLoading]);

  return <RouterProvider router={router} />;
}
```

**Report:** auth bootstrap working (πιθανώς όχι testable ακόμα).

═════════════════════════════════════════════════════════
CHECKPOINT 5: Login page
═════════════════════════════════════════════════════════

Δημιούργησε `src/pages/Login.tsx`:

```tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { BrandMark } from "@/components/ui/BrandMark";

export function Login() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      setError("Δώσε έγκυρο email");
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <BrandMark />
          <p className="text-text-muted mt-2">Διαχείριση οικονομικών</p>
        </div>

        {!sent ? (
          <div className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@evochia.gr"
                autoFocus
              />
            </div>

            {error && <p className="text-expense text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-charcoal text-text-on-dark rounded-md py-3 text-sm font-medium hover:bg-charcoal-soft disabled:opacity-50"
            >
              {submitting ? "Αποστολή…" : "Αποστολή magic link"}
            </button>

            <p className="text-caption text-center">
              Θα λάβεις email με σύνδεσμο για είσοδο.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-3 py-8">
            <div className="text-h2">Έλεγξε το email σου</div>
            <p className="text-text-secondary">
              Στείλαμε σύνδεσμο εισόδου στο <strong>{email}</strong>
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-gold text-sm font-medium"
            >
              Άλλο email →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Report:** login page works visually.

═════════════════════════════════════════════════════════
CHECKPOINT 6: Protected routes wrapper
═════════════════════════════════════════════════════════

Δημιούργησε `src/components/ProtectedRoute.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAppStore();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-text-muted">Φόρτωση…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

Update `src/App.tsx` router:

```tsx
const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      // ... όλα τα existing routes
    ],
  },
]);
```

**Report:** redirect σε /login αν unauthenticated, working session keeps you in app.

═════════════════════════════════════════════════════════
CHECKPOINT 7: Sign out + minimal Settings page
═════════════════════════════════════════════════════════

Αντικατέστησε το placeholder Settings με real (minimal για τώρα):

```tsx
// src/pages/Settings.tsx
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";

export function Settings() {
  const { user } = useAppStore();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-h1">Ρυθμίσεις</h1>

      <section className="bg-cream border border-border-light rounded-md p-4">
        <h2 className="text-h3 mb-2">Λογαριασμός</h2>
        <p className="text-text-muted text-sm mb-3">{user?.email}</p>
        <button
          onClick={handleSignOut}
          className="text-expense text-sm font-medium hover:underline"
        >
          Αποσύνδεση
        </button>
      </section>

      <p className="text-caption">
        Περισσότερες ρυθμίσεις σύντομα — backup, export, sync settings.
      </p>
    </div>
  );
}
```

Wire στο router.

═════════════════════════════════════════════════════════
FINAL: Manual test + commit + push
═════════════════════════════════════════════════════════

Manual test:
1. App start → redirect σε /login (αν not signed in)
2. Πληκτρολόγησε email του Heraklis → "Αποστολή magic link"
3. Heraklis ελέγχει inbox → click link
4. Επιστρέφει σε / → Dashboard φορτώνει
5. Settings → email εμφανίζεται → "Αποσύνδεση" → /login

```bash
git add -A
git commit -m "feat(auth): Supabase auth with magic link

- Add Postgres schema migrations (supabase/migrations/)
- Add RLS policies for all 6 tables
- Configure @supabase/supabase-js client
- Auth state in Zustand store
- Login page with magic link flow
- ProtectedRoute wrapper for authenticated areas
- Minimal Settings page with sign out

Phase 2 entry — cloud-side now wired. Sync engine in next session."
git push
```
````
