# CLAUDE.md

> Auto-loaded context για Claude Code. Διάβασε ολόκληρο πριν γράψεις κώδικα.
> Είσαι follow-up session — δεν ξεκινάς από μηδέν.

---

## TL;DR — διάβασε πρώτα αυτό

**Project:** Evochia Finance — Tauri 2 desktop + Android app για διαχείριση οικονομικών ενός ελεύθερου επαγγελματία στον χώρο της εστίασης.

**Owner:** Heraklis. Founder & executive chef του Evochia (premium private chef + catering, Athens). Greek-speaking. Έχει dev background.

**Stack:** Tauri 2 + Vite + React + TypeScript strict + Tailwind v3 hybrid + SQLite local + (Phase 2) Supabase EU για sync.

**Current state:** Day 1 scaffolding έτοιμο και runnable. Frontend ports από Claude Design output. Local SQLite με seed data. Dashboard + AddTransaction functional. Ένας προηγούμενος agent (Codex) ξεκίνησε continuation work — υπάρχει νέα δουλειά πάνω από αυτό το baseline που πρέπει να ελέγξεις.

**Όχι iOS, όχι Google Play distribution σε αυτή τη φάση.** Single-user.

---

## Πώς να χρησιμοποιήσεις αυτό το έγγραφο

1. Διάβασέ το ολόκληρο μία φορά
2. Διάβασε `docs/Evochia_Finance_Project_Plan_v1.1.md` (full architecture)
3. Διάβασε `docs/Claude_Design_Brief.md` (visual direction)
4. Διάβασε `docs/CODEX_HANDOFF.md` (έχει επιπλέον detail σε priorities + anti-patterns)
5. Run `git log` + κοίτα τι έχει αλλάξει από το Day 1 baseline
6. Run `pnpm tauri:dev` και επιβεβαίωσε τι δουλεύει
7. Συνέχισε

---

## Ο χρήστης — Heraklis

Είναι σημαντικό να καταλάβεις τον χρήστη πριν προτείνεις πράγματα.

**Background:**
- Chef + business owner, αλλά **έχει πραγματική dev εμπειρία**: Tauri για ham radio examination app (2024), GreyScript για το game Grey Hack, Software Inc modding, custom GPTs, Power Automate, web tools για το evochia.gr (deployed σε Vercel από heraklist/evochia_site).
- Άρα: μπορείς να μιλάς στο level ενός μέτριου developer. Δεν χρειάζεται over-explanation.
- Έχει χρήμα + χρόνο για το project, αλλά αξιολογεί ROI σοβαρά.

**Communication:**
- Επικοινωνεί στα **Ελληνικά**. Απάντα στα Ελληνικά. Κώδικας/identifiers στα Αγγλικά (standard).
- Προτιμά **concrete deliverables αντί ατελείωτο deliberation**. Αν δεις σημάδια "we keep planning, never building" — ship something.
- Δέχεται και ζητάει **honest pushback**. Αν διαφωνείς, πες το. Με reasoning.
- **Κάνει αλλαγές γνώμης** — έχουμε πιβοτάρει αρχιτεκτονικά αρκετές φορές. Είναι OK να επισημάνεις pattern, αλλά μετά ακολούθα την τελική απόφαση.

**Working style:**
- Mobile-first χρήστης (απαντά συχνά από κινητό)
- Δεν θέλει long walls of text — concise responses
- Δίνει ξεκάθαρες απαντήσεις σε ξεκάθαρες ερωτήσεις
- Εκτιμά όταν παίρνεις ευθύνη και προχωράς

**Τι **δεν** του αρέσει:**
- Sycophancy ("great question!")
- Έλλειψη commitment ("ίσως μπορούσαμε να σκεφτούμε...")
- Επανάληψη ερωτήσεων που έχει ήδη απαντήσει
- Generic / corporate tone

---

## Το ταξίδι μέχρι εδώ (κρίσιμο context)

Για να μη ξεκινήσεις να προτείνεις πράγματα που έχουμε ήδη απορρίψει, εδώ είναι το decision narrative:

### 1. Started: 2 Excel templates ως input
Heraklis ανέβασε `Ετήσια_Οικονομικά_.xlsx` και `Ετήσιος_Ισολογισμος_.xlsx` — υπάρχοντα tracking templates. Το δεύτερο είχε broken SUMIFS (column references λάθος, πάντα έδινε 0).

### 2. Συζητήθηκαν 5 αρχιτεκτονικές, εξετάστηκαν με ROI lens

| # | Architecture | Status | Γιατί απορρίφθηκε / επιλέχθηκε |
|---|---|---|---|
| A | PWA + Supabase + Vercel | rejected | Browser-storage limits, offline σημαντικό για catering |
| B | Καλύτερο Excel template | rejected | Mobile entry friction, no receipt photos inline |
| C | MS365 Forms + Power Automate + Excel Online | rejected | Δεν φτάνει σε "app feel", χάνει continuity |
| D | Web app via Claude Design | rejected για finance | Frontend μόνο, sync problem μένει, accountant doesn't get .xlsx |
| **E** | **Tauri 2 desktop + Android, local SQLite, custom sync με Supabase** | **chosen** | Offline-first σημαντικό, Heraklis έχει Tauri εμπειρία, single codebase, free hosting |

**Locked decision:** Tauri E. Όλα τα παραπάνω είναι **closed**. Μη τα ξανανοίξεις.

### 3. Σχεδιάστηκε V2 Excel ως bridging tool
Πριν αποφασιστεί το Tauri, φτιάχτηκε `Evochia_Finance_v2.xlsx` με premium design (charcoal/gold/cream palette, KPI tiles, sheet navigation). Αυτό **δεν** είναι το final product — είναι reference για τα design tokens και ένα fallback που θα μπορούσε να τρέχει παράλληλα. Αν δεις references, αυτό είναι.

### 4. Claude Design έδωσε visual prototypes
Heraklis έτρεξε το `docs/Claude_Design_Brief.md` μέσα από το Anthropic's Claude Design product, και πήρε πίσω HTML/CSS/JS με όλα τα screens. Αυτά **έγιναν port** στο TypeScript codebase. Συγκεκριμένα:
- `tokens.css` έγινε `tailwind.config.ts` + `src/index.css`
- `components.jsx` έγινε `src/components/ui/*.tsx`
- `screens.jsx` έγινε reference για τα `src/pages/*.tsx`

Heraklis ζήτησε μία τροποποίηση: **αφαίρεση του "Evochia" από το BrandMark** — μένει μόνο "◆ Finance". Είναι ήδη implementemented. **Μην το αλλάξεις.**

### 5. Day 1 codebase delivered + Codex picked up continuation
Όταν ξεκινάς, υπάρχει υπάρχουσα δουλειά πάνω στο Day 1 baseline που έκανε προηγούμενος agent (Codex). Έλεγξέ τη πρώτα.

---

## Tech Stack (snapshot)

```
Frontend
├── Tauri 2.1                  desktop + Android shell (Rust)
├── Vite 5                     dev server + build
├── React 18                   UI framework
├── TypeScript strict          all code
├── Tailwind v3 (NOT v4)       utility classes
├── shadcn/ui (Radix)          form primitives (forms, dialogs, popovers)
├── Lucide icons               1.5px stroke style
├── Recharts                   bar/line charts
├── react-router-dom           routing
├── react-hook-form + zod      form validation
└── TanStack Query             server state (Phase 2)

Local DB (Tauri shell)
├── SQLite                     primary store, ALL writes go here first
├── tauri-plugin-sql           DB access from frontend
└── outbox pattern             pending mutations table

Sync (Phase 2 — not yet wired)
├── Supabase EU/Frankfurt      Postgres + Auth + Storage
├── Magic link auth            no passwords
└── Custom sync engine         outbox + last-write-wins (single user)

Build & Distribution
├── pnpm                       package manager
├── GitHub Actions             CI/CD (Phase 3+)
└── finance.evochia.gr         landing + auto-update manifests
```

---

## Current state — τι δουλεύει, τι όχι

### ✅ Day 1 baseline (έτοιμο και runnable)
- Tauri 2 desktop launches
- SQLite με auto-migrations
- Seed data: 2 books (Επαγγελματικά, Προσωπικά), 6 accounts, 26 categories full Greek
- **Dashboard** page: KPI tiles + bar chart + recent transactions, queries SQLite
- **AddTransaction** page: form με smart defaults, auto VAT compute, saves σε local + outbox
- React Router με 7 routes
- Greek UI throughout
- Design tokens applied
- Mobile-first responsive
- SyncPill (statically "synced" — Phase 2 wires it)

### ⏳ Stubs (placeholder pages έτοιμοι)
- `/transactions` — full list + search/filter
- `/recurring` — recurring templates
- `/vat` — quarterly summary
- `/forecast` — 12-month projection
- `/settings` — preferences + Excel export

### ❌ Όχι ακόμα
- Supabase integration (auth, sync)
- Receipt photo upload
- Transaction edit/delete
- Cascading dropdowns (book/type → categories)
- Excel export
- Auto-updater
- Android build (untested)

### ❓ Codex's continuation work
Δεν ξέρω τι έχει αλλάξει. **Πρώτο πράγμα που θα κάνεις:**

```bash
git log --oneline -20
git diff <day-1-commit>..HEAD --stat
```

Αυτό θα σου πει τι άλλαξε. Μετά review τα changes, αν κάτι αποκλίνει από plan ή conventions → πες στον Heraklis πριν προχωρήσεις.

---

## Reference documents (διάβασέ τα)

| File | Τι περιέχει |
|---|---|
| `docs/Evochia_Finance_Project_Plan_v1.1.md` | **Source of truth.** Architecture, data model, roadmap, security, ops, costs, risks |
| `docs/Claude_Design_Brief.md` | Visual direction, brand identity, design tokens, screen specs, Greek copy |
| `docs/CODEX_HANDOFF.md` | Priority list, anti-patterns, locked decisions, conventions (πιο aggressive σε "what NOT to do") |
| `README.md` | Quick start, project structure, dev notes |

---

## Conventions — απόλυτα

### Code style
- TypeScript **strict**. No `any`. Explicit return types σε public functions.
- Functional components + hooks. No classes.
- Path alias `@/` για imports
- Async/await, όχι `.then()` chains
- Named exports για components

### Styling — δύο layers
- **Tailwind utilities** για layout, spacing, common typography
- **Custom CSS classes** στο `src/index.css` `@layer components` για brand-identity components (`.kpi-tile`, `.tx-row`, `.sync-pill`, `.chip`, `.fab`, etc.)
- **ΠΟΤΕ νέα colors** εκτός των ορισμένων στο `tailwind.config.ts`
- Mobile-first: base case για 375px, breakpoints `md:`, `lg:` για desktop

### Database
- **Όλα τα writes** μέσω helpers σε `src/lib/<entity>.ts`. Ποτέ raw `db.execute()` σε components.
- **Outbox entry** για κάθε mutation που πρέπει να συγχρονιστεί. Pattern υπάρχει στο `createTransaction`.
- **UUIDs client-side** μέσω `uuid()` helper. Όχι AUTOINCREMENT (sync requires).
- ISO 8601 timestamps μέσω `now()` helper.

### Greek copy
- Όλα τα user-facing strings στα Ελληνικά
- Reference: `docs/Claude_Design_Brief.md` Section 7 έχει όλα τα labels
- Numbers: `formatEuro()` (Greek locale: `1.234,56 €`)
- Dates: `formatDateRelative()` ("Σήμερα" / "Χθες" / "06 Μαΐ")

### Brand
- BrandMark = "◆ Finance" (no "Evochia"). Ζητήθηκε ρητά. Don't change.
- Παλέτα: charcoal + gold + cream + functional (income green, expense red). **Μόνο αυτά.**

---

## Locked decisions — δεν ξανασυζητούνται

| Decision | Locked answer |
|---|---|
| Architecture | Tauri 2 desktop + Android |
| Frontend | Vite + React + TypeScript strict |
| Styling | Tailwind v3 hybrid + custom CSS |
| Components | shadcn/ui (forms) + custom (KPI/TxRow/SyncPill) |
| Backend | Supabase EU/Frankfurt |
| Sync | Custom Option A (outbox + LWW) |
| Auth | Magic link |
| Local DB | SQLite via tauri-plugin-sql |
| Domain | finance.evochia.gr |
| Repo | heraklist/evochia_finance (private) |
| Distribution | Sideload για Heraklis (no Google Play) |
| Brand mark | "◆ Finance" (no "Evochia") |
| Excel export | Phase 4, για λογιστή |
| Phasing | Continuous deployment, sequential dependency order |
| iOS | NOT in scope (Phase 5+ if ever) |

**Αν προτείνεις να αλλάξει κάποια από αυτά, ΕΧΕΙΣ ΛΑΘΟΣ.** Θα έχουμε ήδη συζητήσει το trade-off πιο πάνω και θα έχουμε καταλήξει εδώ. Έλεγχος: αν σκέφτεσαι "ίσως καλύτερα Next.js", "ίσως PowerSync αντί custom sync", "ας πάμε σε Electron" — STOP, διάβασε ξανά αυτό το section.

---

## Anti-patterns — μη πέσεις σε αυτά

- **Architecture pivots** — βλέπε locked decisions
- **Σε νέα colors** — ΟΧΙ. Παλέτα είναι κλειδωμένη.
- **Tailwind v4** — όχι ακόμα (shadcn σε v3)
- **Service_role key requests** — ΠΟΤΕ μη ζητήσεις από Heraklis. Μόνο anon.
- **Public repo** — repo είναι private. Αν είναι public κατά λάθος, πες του να το γυρίσει σε private.
- **Console.log** σε production code (μόνο `console.error` για actual errors)
- **Decorative emojis** (μόνο functional)
- **Drop shadows on cards** (μόνο borders + sand backgrounds)
- **Stock illustrations / hero graphics**
- **Sycophancy** — "great question!" / "absolutely!" — όχι αυτό
- **"Maybe we should..."** χωρίς commitment — say what you'll do
- **Repeated questions** — αν είναι σε docs, ψάξε πρώτα

---

## Πώς να εργαστείς

### Όταν παραλαμβάνεις τη δουλειά
1. Run `git log --oneline -20` — δες τι έγινε από Day 1
2. Run `pnpm install && pnpm tauri:dev` — επιβεβαίωσε τρέχει
3. Έλεγξε αν Codex's work ολοκληρώνει ή σπάει κάτι από Day 1
4. Δες τις priorities στο `docs/CODEX_HANDOFF.md` Section 2 — από τη λίστα βρες τι **δεν** έχει γίνει ακόμα

### Όταν δουλεύεις
- Test σε real Windows desktop πριν πεις "works"
- Type-check (`pnpm typecheck`) και lint (`pnpm lint`) πριν commit
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Small commits, focused. Όχι "stuff" commits.

### Όταν είσαι unsure
- Διάβασε project plan + design brief πρώτα
- Ψάξε τον υπάρχοντα κώδικα για patterns
- Ρώτα Heraklis με concrete options ("A ή B; A δίνει X, B δίνει Y")
- ΟΧΙ "πώς θες να το κάνω;" χωρίς context

### Όταν διαφωνείς
- Πες το honestly με reasoning
- Αν επιμένει → σεβάσου, προχώρα. Είναι ο owner.
- Αν προβλέπεις πραγματικό κίνδυνο (data loss, security) → επιμένε με explicit warning

### Όταν τελειώνεις κάτι
- Demo πώς το test-άρισες (πχ "πάτησα Add → καταχώρησα 50€ ψώνια → εμφανίστηκε στο Dashboard ✓")
- Πες τι ΔΕΝ test-άρισες (αν κάτι ξέφυγε)
- Ενημέρωσε το README αν άλλαξε τι δουλεύει
- Ενημέρωσε **αυτό το CLAUDE.md** αν άλλαξε state worth knowing για επόμενο agent

---

## Επόμενες priorities (από CODEX_HANDOFF.md)

Σε σειρά:

1. **Verify Day 1 + Codex work runs end-to-end**. Πιθανά first-launch issues:
   - Tauri 2 plugin version mismatches (Cargo.toml vs npm)
   - Capabilities permissions στο `default.json` (Tauri 2 strict)
   - SQL syntax issues στις migrations
   - Greek font rendering (Inter πρέπει να φορτώνει Greek glyphs)

2. **Συμπλήρωσε P0 screens**:
   - `/transactions` — full list με search/filter
   - `/transactions/:id` — detail/edit/delete

3. **Auth integration με Supabase** (χρειάζεται credentials από Heraklis)

4. **Sync engine** (custom Option A — outbox + push/pull)

5. **Receipt photos** (camera + Supabase Storage)

6. **Cascading dropdowns** στο AddTransaction

7. **Recurring templates** UI + auto-generation

8. **VAT summary, Forecast, Settings, Excel export** (Phase 4)

Δες `docs/CODEX_HANDOFF.md` Section 2 για detail.

---

## Common commands

```bash
# Development
pnpm install              # Install JS deps
pnpm tauri:dev            # Run desktop dev (hot reload)
pnpm tauri:android        # Run Android dev (after init)

# Build
pnpm tauri:build          # Desktop installer
pnpm tauri:android:build  # Android APK

# Quality
pnpm typecheck            # TypeScript check
pnpm lint                 # Biome check
pnpm format               # Biome format

# Git
git log --oneline -20     # Recent commits
git diff main             # Working changes vs main
```

---

## Key file locations

```
src/lib/db.ts             SQLite client + uuid()/now() helpers
src/lib/types.ts          ALL entity types
src/lib/transactions.ts   listTransactions(), createTransaction(), getTotals()
src/lib/reference.ts      listBooks(), listAccounts(), listCategories(), listTags()
src/lib/utils.ts          cn(), formatEuro(), formatDateRelative(), computeVat()

src/components/ui/        BrandMark, KPITile, SyncPill, TransactionRow
src/components/charts/    IncomeExpenseChart
src/components/layout/    AppLayout (header + FAB)

src/pages/Dashboard.tsx          ✅ Functional reference
src/pages/AddTransaction.tsx     ✅ Functional reference (form patterns)
src/pages/Placeholder.tsx        Stub for unbuilt routes

src/index.css                    Design tokens (CSS vars) + custom component classes
tailwind.config.ts               Tailwind theme με όλα τα design tokens
src/App.tsx                      Router

src-tauri/src/lib.rs             Plugin registration + migrations vec
src-tauri/migrations/0001_initial.sql   Schema (9 tables, indexes)
src-tauri/migrations/0002_seed.sql      Default books/accounts/categories
src-tauri/tauri.conf.json        App metadata + bundle config
src-tauri/capabilities/default.json     Plugin permissions
```

---

## Όταν ολοκληρώνεις major work

Πες στον Heraklis:
1. Τι έγινε (1-2 sentences)
2. Πώς το test-άρισες (specific, e.g., "καταχώρησα 3 transactions, sync push δούλεψε στα 5sec")
3. Τι δεν test-άρισες
4. Τι χρειάζεσαι για το επόμενο βήμα

Ανανέωσε:
- Αυτό το CLAUDE.md αν αλλάζει state που πρέπει να ξέρει επόμενο agent
- README.md "What's working" / "What's stubbed"
- Αν αλλάζει αρχιτεκτονική → πρώτα project plan v1.X (αλλά μην το κάνεις χωρίς να ρωτήσεις)

---

## Quick "in the climate" check

Αν μπορείς να απαντήσεις τις παρακάτω χωρίς να ψάξεις, είσαι έτοιμος:

1. Ποια είναι η παλέτα; — *charcoal/gold/cream + functional green/red*
2. Γιατί SQLite local + Supabase remote; — *offline-first με sync, Heraklis δουλεύει σε events με χάλια σήμα*
3. Τι λέει το BrandMark; — *"◆ Finance" (όχι "Evochia")*
4. Magic link auth ή password; — *magic link (single user)*
5. Tailwind v3 ή v4; — *v3 (shadcn compat)*
6. Phase 1 περιλαμβάνει iOS; — *όχι, μόνο desktop + Android*
7. Sync conflict strategy; — *single user, last-write-wins, σπάνια συμβαίνει*
8. Πού έγραφαν αρχικά τα data; — *2 Excel templates, σε MS365 με Forms+Automate ως intermediate option, που τελικά απορρίφθηκε*

---

## Final notes

- **Έχουμε ξοδέψει αρκετές ώρες σε architectural decisions**. Σεβάσου τις. Δεν είναι αυθαίρετες.
- **Continuous deployment**: ship complete features. ΟΧΙ "θα το τελειώσω αργότερα".
- **Ο Heraklis χρησιμοποιεί από Day 3 πραγματικά**. Code πρέπει να είναι production-quality, όχι demo-quality.
- **Είσαι ικανός coder**. Don't be timid. Don't ask for permission for routine decisions. Move forward.
- **Αλλά** — αν θες να αλλάξεις schema, αν θες να φέρεις major dependency, αν θες να αλλάξεις build pipeline: **ρώτα πρώτα**.

Καλή τύχη. Heraklis είναι sharp + present — αν τα κάνεις σωστά θα έχεις επιτυχία γρήγορα.
