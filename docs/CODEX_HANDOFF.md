# Codex Handoff — Evochia Finance

> **Σκοπός:** Αυτό το έγγραφο επιτρέπει σε έναν fresh coding agent (Codex, Claude Code, ή οποιονδήποτε άλλο) να συνεχίσει το project από εκεί που είμαστε τώρα. Διάβασέ το ολόκληρο πριν γράψεις κώδικα.

---

## 0. Πριν ξεκινήσεις

### Ο χρήστης
- **Όνομα**: Heraklis
- **Ρόλος**: Founder & executive chef του Evochia (private chef + catering, Athens)
- **Background**: Έχει dev εμπειρία (Tauri ham radio app, Software Inc modding, GreyScript, web tools για evochia.gr)
- **Γλώσσα**: Επικοινωνεί στα **Ελληνικά**. Απάντα στα Ελληνικά, αλλά με κώδικα σε Αγγλικά (όπως είναι standard).
- **Στιλ**: Προτιμά concrete deliverables αντί για ατελείωτο deliberation. Honest pushback όπου χρειάζεται.

### Κρίσιμα reference docs (διάβασέ τα ΟΛΑ πριν προχωρήσεις)
1. **`docs/Evochia_Finance_Project_Plan_v1.1.md`** — η αρχιτεκτονική, data model, roadmap. Source of truth.
2. **`docs/Claude_Design_Brief.md`** — visual direction, design tokens, brand identity.
3. **`README.md`** — current state του project, setup instructions.

### Project structure
```
evochia_finance/
├── src/                          # React frontend (TypeScript strict)
│   ├── App.tsx                   # Router
│   ├── main.tsx                  # Entry
│   ├── index.css                 # Design tokens + Tailwind directives + custom components
│   ├── components/
│   │   ├── ui/                   # Custom: BrandMark, KPITile, SyncPill, TransactionRow
│   │   ├── charts/               # Recharts wrappers
│   │   └── layout/               # AppLayout (header + FAB)
│   ├── pages/                    # Routed screens
│   │   ├── Dashboard.tsx         # ✅ Functional
│   │   ├── AddTransaction.tsx    # ✅ Functional
│   │   └── Placeholder.tsx       # 5 stubs έτοιμοι
│   ├── lib/                      # Business logic
│   │   ├── db.ts                 # SQLite client
│   │   ├── types.ts              # Entity types
│   │   ├── transactions.ts       # CRUD + computed VAT
│   │   ├── reference.ts          # Books/Accounts/Categories
│   │   └── utils.ts              # cn(), formatEuro(), VAT compute
│   └── hooks/                    # κενό, αναμένει custom hooks
├── src-tauri/                    # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── lib.rs                # Plugins + migrations registration
│   │   └── main.rs               # Bin entry
│   ├── migrations/
│   │   ├── 0001_initial.sql      # Schema (9 tables)
│   │   └── 0002_seed.sql         # Default data
│   ├── capabilities/default.json # Plugin permissions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/                         # Reference docs
└── package.json, tsconfig, etc.  # Standard tooling
```

---

## 1. Τι είναι ήδη έτοιμο (Day 1)

### ✅ Λειτουργικό
- Tauri 2 desktop app launches
- SQLite database με auto-migrations on first run
- Seed data (2 books, 6 accounts, 26 Greek categories)
- **Dashboard page** με KPI tiles + bar chart + recent transactions (queries SQLite)
- **AddTransaction page** με smart defaults, computes VAT auto, saves σε local + outbox
- React Router με 7 routes
- Greek UI όλη
- Design tokens fully applied (charcoal + gold + cream palette)
- Mobile-first responsive layout
- SyncPill (statically "synced" — wire-up coming Phase 2)
- TypeScript strict mode

### ⏳ Stubbed (placeholders)
- `/transactions` — full list με search/filter
- `/recurring` — recurring templates
- `/vat` — quarterly summary
- `/forecast` — 12-month projection
- `/settings` — preferences + Excel export

### ❌ Όχι ακόμα
- Supabase integration (auth, sync)
- Receipt photo upload
- Transaction edit/delete
- Cascading dropdowns (category → subcategory)
- Excel export
- Auto-updater
- Android build (works in theory, untested)

---

## 2. Επόμενες προτεραιότητες

**Δούλεψε τις σε αυτή τη σειρά.** Μην παρασύρεσαι σε refactors ή νέα features εκτός λίστας χωρίς να ρωτήσεις τον Heraklis πρώτα.

### Priority 1: Verify Day 1 runs end-to-end (URGENT)

Πριν οτιδήποτε άλλο:

```bash
cd evochia_finance
pnpm install
pnpm tauri:dev
```

**Πιθανά first-launch issues** που πρέπει να ψάξεις και να διορθώσεις:

1. **Tauri 2 plugin versions** — Στο `Cargo.toml` υπάρχουν minor versions που μπορεί να μη ταιριάζουν με τα npm packages. Αν compile error, sync τα versions (check tauri.app/v2/plugins/sql).
2. **Capabilities permissions** — Το `src-tauri/capabilities/default.json` ίσως χρειάζεται περισσότερα grants. Tauri 2 είναι πιο strict από v1. Run app, αν δεις permission denied στο console, πρόσθεσε τα grants.
3. **`tauri-plugin-sql` schema** — Αν η plugin κάνει error στις migrations, ενδέχεται να χρειάζεται διαφορετικό SQL syntax (πχ `INTEGER PRIMARY KEY AUTOINCREMENT` vs `INTEGER PRIMARY KEY`).
4. **Tailwind v3 vs v4** — Επίτηδες v3 (καλύτερο shadcn support). Μην το αναβαθμίσεις χωρίς να ρωτήσεις.
5. **Greek font rendering** — Inter πρέπει να φορτώνει σωστά Greek glyphs. Αν όχι, prepend `Aptos` ή `Noto Sans Greek`.

Όταν τρέχει επιτυχώς:
- Επαλήθευσε ότι Dashboard δείχνει empty state πρώτη φορά
- Καταχώρησε μία test transaction από `/add`
- Επιβεβαίωσε ότι εμφανίζεται στο Dashboard recent list
- Επιβεβαίωσε ότι τα totals υπολογίζονται σωστά

**Αν χρειαστεί να αλλάξεις κάτι structural για να τρέξει**, ενημέρωσε τον Heraklis πριν.

### Priority 2: Συμπλήρωση των P0 screens

Από το project plan, P0 = "Phase 1 must-have". Αυτά λείπουν:

- **Transactions list page** (`/transactions`)
  - Full list με date headers (group by date)
  - Search bar (debounced)
  - Filter sheet (Date range, Book, Category, Tag)
  - Tap row → detail page
  - Empty state, no-results state, loading state
  - Use `listTransactions()` από `@/lib/transactions`

- **Transaction detail/edit page** (`/transactions/:id`)
  - Show full transaction
  - Edit button → form (reuse logic από AddTransaction)
  - Delete με confirmation dialog
  - View receipt photo if present (placeholder for Phase 2)

**Conventions:** ίδιος design language με τα υπάρχοντα screens. Reuse `KPITile`, `TransactionRow`, `topbar`, `chip`, `form-label`, `btn-*` κλπ. **Μην** φτιάξεις νέα design language.

### Priority 3: Auth integration με Supabase

⚠️ **Πρώτα ζήτα από τον Heraklis το Supabase Project URL + Anon key**. Δεν δουλεύεις χωρίς αυτά.

- Δημιούργησε `src/lib/supabase.ts` με τον Supabase client
- Δημιούργησε `src/pages/Login.tsx` με magic link form
- Δημιούργησε `src/lib/auth.ts` με sign in / sign out / session helpers
- Token storage σε OS keychain via `tauri-plugin-stronghold` ή plain localStorage για αρχή
- Protect routes — αν δεν υπάρχει session, redirect σε /login
- Ενημέρωσε `AppLayout` για user menu (sign out)

**Σημαντικό:** Anon key είναι safe να commit-αρει σε public code (RLS προστατεύει). Service_role key ΠΟΤΕ. Αν Heraklis προσπαθήσει να σου δώσει service_role, πες "όχι, δώσε μου anon".

### Priority 4: Sync engine (custom Option A)

Εφόσον auth δουλεύει:

- Δημιούργησε `src/lib/sync.ts` με:
  - `pullChanges()` — fetch rows με `updated_at > last_synced_at` από Supabase
  - `pushChanges()` — διάβασε από `sync_outbox`, ανέβασε σε Supabase, mark synced
  - `syncAll()` — pull + push
- Background worker σε `useEffect` στο App.tsx, polling κάθε 30s όταν online
- Wire το `SyncPill` σε real state από Zustand store
- Manual "Sync now" στο Settings page

**Reference**: project plan Section 6 για το πλήρες σχέδιο του sync (outbox pattern, last-write-wins).

### Priority 5: Receipt photos

- Native camera button στο AddTransaction με Tauri plugin (`tauri-plugin-camera` community ή `tauri-plugin-fs` για file picker fallback)
- Αποθήκευση τοπικά σε `app_data_dir/receipts/{uuid}.jpg`
- Image compression πριν αποθήκευση (canvas resize σε max 1200px)
- Sync engine ανεβάζει σε Supabase Storage async
- TransactionRow + Detail δείχνουν thumbnail/full view

### Priority 6: Cascading dropdowns

Στο AddTransaction:
- Όταν επιλεγεί Book → φιλτράρισμα Accounts list
- Όταν επιλεγεί Type (income/expense) → φιλτράρισμα Categories list
- Τώρα γίνεται με reload — απλοποίησέ το με Zustand ή useReducer

### Priority 7+: Recurring, VAT, Forecast, Settings, Excel export

Δες project plan Phase 3 + 4 για λεπτομέρειες.

---

## 3. Κανόνες — what to do

### Code style
- **TypeScript strict mode** — όλα τα types explicit, no `any`
- **Functional components** + hooks. No class components.
- **Path alias `@/`** για imports (`@/lib/db` αντί `../../lib/db`)
- **Async/await**, όχι `.then()` chains
- **Named exports** preferred (έχουμε ήδη). No default exports για components.

### Styling
- **Tailwind utility classes** για layout, spacing, typography
- **Custom CSS classes** (`.kpi-tile`, `.tx-row`, `.sync-pill`, `.chip`) για components με brand-identity shape
- Έχει set up και τα δύο. Όταν προσθέτεις νέο component, αποφάσισε ποιο fits — αν είναι one-off layout χρησιμοποίησε Tailwind, αν είναι reusable με unique appearance βάλε CSS class στο `index.css` `@layer components`.
- **ΠΟΤΕ μη προσθέσεις νέα colors**. Χρησιμοποίησε MONO όσα ορίζει το `tailwind.config.ts`.
- **Mobile-first**: γράψε το base case για 375px, πρόσθεσε `md:`, `lg:` για desktop refinements.

### Database
- **Όλα τα writes** μέσω helper functions στο `src/lib/<entity>.ts`. Μην κάνεις raw `db.execute()` σε components.
- **Outbox entry** για κάθε mutation που πρέπει να συγχρονιστεί. Δες pattern στο `createTransaction`.
- **UUIDs client-side** μέσω `uuid()` helper — ΟΧΙ AUTOINCREMENT (sync needs).
- **Timestamps σε ISO 8601** (`now()` helper).

### Greek copy
- Όλα τα user-facing strings στα Ελληνικά
- **Reference**: `docs/Claude_Design_Brief.md` Section 7 — έχει όλα τα labels
- Μη μηχανικά μεταφρασμένα. "VAT" → "ΦΠΑ", "Sign in" → "Είσοδος", "Save" → "Αποθήκευση"
- Numbers: `formatEuro()` από `@/lib/utils` (Greek locale formatting: 1.234,56 €)
- Dates: `formatDateRelative()` ("Σήμερα", "Χθες", ή "06 Μαΐ")

### Brand
- BrandMark είναι **σκοπίμως** μόνο "◆ Finance" (χωρίς "Evochia"). Ο Heraklis το ζήτησε ρητά. Μην το αλλάξεις.
- Παλέτα: charcoal/gold/cream + functional (income green, expense red). Μην προσθέσεις άλλα colors.

### Conventions ονομάτων
- Files: `PascalCase.tsx` για components, `kebab-case.ts` ή `camelCase.ts` για lib
- Components: `PascalCase`
- Hooks: `useThing`
- Utility functions: `camelCase`
- DB tables: `snake_case` (matches SQL convention)

---

## 4. Κανόνες — what NOT to do

### Architecture pivots
- **ΠΟΤΕ μην προτείνεις** "ίσως καλύτερα Next.js αντί Vite" ή "ίσως PowerSync αντί custom" ή "ας πάμε σε Electron". Έχουμε ξοδέψει ώρες σε αυτές τις αποφάσεις. Είναι κλειδωμένες.
- Το ίδιο για Tauri 2, Supabase EU, magic link auth, custom sync layer.
- Αν αληθινά νομίζεις ότι κάτι χρειάζεται αλλαγή, **ρώτα τον Heraklis με concrete reasoning** — μην προχωρήσεις μόνος σου.

### Scope creep
- ΟΧΙ νέα features εκτός project plan χωρίς ρώτημα
- ΟΧΙ "θα ήταν cool να έχουμε X" — εστίασε στις priorities
- Έχουμε plan με phases. Σεβάσου το.

### Dependencies
- **Μη αναβαθμίσεις** Tailwind σε v4 (shadcn σε v3 ακόμα)
- **Μην προσθέσεις** UI library πέρα από αυτά που ήδη υπάρχουν (`@radix-ui/*`, `lucide-react`, `recharts`)
- **Μη συστήσεις** δραματικά πιο μεγάλες deps για μικρά προβλήματα

### Security / secrets
- **ΠΟΤΕ μην commit-άρεις secrets**. `.env.local` είναι gitignored, χρησιμοποίησε αυτό.
- **ΠΟΤΕ μην ζητήσεις service_role key** από τον Heraklis. Μόνο anon key.
- **Πάντα** RLS policies σε Supabase όταν προστίθενται tables.
- **Repo πρέπει να είναι private**. Αν Heraklis κατά λάθος το έκανε public, πες του να αλλάξει visibility.

### Visual design
- ΟΧΙ νέα colors
- ΟΧΙ shadows σε κάρτες (μόνο borders + sand backgrounds)
- ΟΧΙ rounded corners > 12px
- ΟΧΙ purple/blue gradients (anti-pattern)
- ΟΧΙ emojis διακοσμητικά (μόνο functional)
- ΟΧΙ stock illustrations / hero graphics

### Code quality
- Όχι `console.log` σε production code (μόνο `console.error` για actual errors)
- Όχι unused imports / variables (TS strict will flag)
- Όχι TODO comments χωρίς context — γράψε κανονικό issue
- Όχι μεγάλα components (>250 lines = split it)

---

## 5. Πώς να επικοινωνείς με τον Heraklis

### Όταν ολοκληρώνεις κάτι
- Πες σύντομα τι έγινε
- Δώσε τα αρχεία (πραγματικά, με σωστά paths)
- Πες τι χρειάζεται από αυτόν για το επόμενο βήμα

### Όταν είσαι unsure
- Ρώτα concrete ερωτήσεις. ΟΧΙ "πώς θες να το κάνω;" αλλά "θες Α ή Β; (πραγματικά διαφορετικά results)"
- Μην ξανακάνεις ερωτήσεις που έχουν απαντηθεί σε docs. Ψάξε πρώτα.

### Όταν διαφωνείς με αίτημά του
- Πες την ένστασή σου honestly με reasoning
- Αλλά αν επιμένει, σεβάσου την απόφαση και προχώρα. Είναι ο owner.

### Όταν κάτι δεν δουλεύει
- Πες τι δοκίμασες, τι error είδες, τι σκέφτεσαι ότι μπορεί να φταίει
- ΟΧΙ ψεύδη ότι "δουλεύει" χωρίς να το έχεις δοκιμάσει

### Format χρήστη
- Mobile-friendly responses (όχι unnecessary walls of text)
- Greek language
- Concrete > abstract
- Files όταν το deliverable είναι structured content (όπως αυτό το έγγραφο)

---

## 6. Continuous deployment philosophy

Συμφωνήσαμε σε **continuous deployment** αντί για phase-based delivery:

- Κάθε feature ζωντανό ΜΟΛΙΣ έτοιμο
- Ο Heraklis χρησιμοποιεί από Day 3 πραγματικά, παρέχει feedback
- Δεν κρατάμε τίποτα "για το τέλος"

Αυτό σημαίνει:
- Ολοκλήρωσε **πλήρως** ένα feature πριν προχωρήσεις στο επόμενο
- ΟΧΙ "θα το τελειώσω αργότερα" στιλ — αν δεν είναι ready, μην το merge-άρεις
- Test σε πραγματικό device όπου εφικτό
- Tag releases (`v0.1.0`, `v0.2.0`...) όταν ζωντανεύει νέο feature

---

## 7. Decision log (locked decisions από conversation)

Αυτές είναι **locked**. Μην τις ξανανοίξεις:

| Decision | Locked answer |
|---|---|
| App architecture | Tauri 2 desktop + Android (όχι PWA, όχι Electron, όχι native iOS Phase 1) |
| Frontend framework | Vite + React + TypeScript strict |
| Styling | Tailwind v3 hybrid με custom CSS για brand components |
| Component library | shadcn/ui hybrid (forms primitives) + custom (KPI/TxRow/SyncPill) |
| Backend | Supabase EU/Frankfurt |
| Sync | Custom Option A (outbox pattern) |
| Auth | Magic link |
| Local DB | SQLite via tauri-plugin-sql |
| Domain | finance.evochia.gr |
| Repo | heraklist/evochia_finance (private) |
| Distribution | Sideload για Heraklis (no Google Play) |
| Greek-first UI | ναι |
| Brand mark | "◆ Finance" (χωρίς "Evochia") |
| Excel export | ναι, Phase 4, για λογιστή |

---

## 8. Quick reference

### Run dev
```bash
pnpm install
pnpm tauri:dev          # desktop
pnpm tauri:android      # Android (αφού φτιάξεις setup)
```

### Build production
```bash
pnpm tauri:build        # desktop installer
pnpm tauri:android:build  # Android APK
```

### Add a database migration
1. New file: `src-tauri/migrations/000N_description.sql`
2. Register σε `src-tauri/src/lib.rs` `migrations` vec
3. Auto-applies σε επόμενο launch

### Add a new screen
1. New page: `src/pages/MyScreen.tsx`
2. Register σε `src/App.tsx` router
3. Update README "What's working" section

### Format check
```bash
pnpm typecheck
pnpm lint
```

---

## 9. When in doubt

1. **Διάβασε το project plan** (`docs/Evochia_Finance_Project_Plan_v1.1.md`)
2. **Διάβασε το design brief** (`docs/Claude_Design_Brief.md`)
3. **Ψάξε στον υπάρχοντα κώδικα** για patterns
4. **Ρώτα τον Heraklis** με concrete options

---

*Έγγραφο γραμμένο από Claude. Ενημερώνεται με κάθε milestone — αν αλλάζει η αρχιτεκτονική, αυτό το αρχείο είναι το πρώτο που πρέπει να ενημερωθεί.*
