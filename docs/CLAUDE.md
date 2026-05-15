# CLAUDE.md

> Auto-loaded context για Claude Code. Διάβασε πριν γράψεις κώδικα. Το project δεν είναι Day 1 scaffold πλέον.

---

## TL;DR

**Project:** Evochia Finance — Tauri 2 desktop + Android app για local-first οικονομική διαχείριση στον χώρο της εστίασης.

**Owner:** Heraklis, Greek-speaking, με dev background. Θέλει concrete deliverables, όχι ατελείωτο planning.

**Current state:** v0.2.3 release candidate. Πλήρες desktop app με SQLite local DB, Supabase Auth/Sync/Storage, password login + TOTP MFA, receipt photos, category CRUD, dashboard filters, recurring, VAT, forecast, Excel export, backup, Stronghold auth storage και GitHub private updater token.

**Repo:** `github.com/heraklist/evochia_finance` private.

**BrandMark locked:** `◆ Finance`. Μην το αλλάξεις σε `Evochia Finance`.

---

## Reading order

1. `AGENTS.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/Evochia_Finance_Project_Plan_v1.1.md`
4. `docs/Claude_Design_Brief.md`
5. Latest QA report in `docs/QA_FINAL_*.md`
6. Active session prompt

---

## Locked Decisions

| Decision | Locked answer |
|---|---|
| App architecture | Tauri 2 desktop + Android |
| Frontend | Vite + React + TypeScript strict |
| Styling | Tailwind v3 hybrid + custom CSS |
| Components | shadcn/Radix primitives + custom finance UI |
| Backend | Supabase EU/Frankfurt |
| Auth | Email/password + TOTP MFA |
| Local DB | SQLite via `tauri-plugin-sql` |
| Sync | Custom outbox + timestamp LWW |
| Storage | Supabase Storage for receipt photos |
| Secure local auth storage | Tauri Stronghold with localStorage fallback |
| Distribution | Manual sideload + signed GitHub Releases |
| Updater | GitHub Releases `latest.json`; private repo uses user-provided read token |
| Repo visibility | Private |
| Brand mark | `◆ Finance` |
| iOS | Not in scope |

Do not reopen these unless Heraklis explicitly asks.

---

## What Works Now

- Auth: password login, protected routes, TOTP MFA enroll/verify/unenroll.
- Local DB: migrations, seed books/accounts/categories, strict helper-based writes.
- Transactions: create, edit, delete, list, detail, filters, tags, receipt photo attach/remove.
- Money parsing: Greek-aware strict parser; rejects malformed values.
- VAT: business-only VAT visibility, input/output labels, 2-decimal rounding.
- Sync: Supabase push/pull, outbox, LWW timestamp checks, reset sync, status polling.
- Recurring: CRUD, active toggle, generation worker, book-aware forms.
- Dashboard: real totals, real monthly chart data, book filter, period filter, VAT hidden for personal.
- VAT Summary and Forecast pages.
- Settings: account, company name, category CRUD links, MFA, sync, backup, export, preferences, updater token.
- Backup: manual JSON + weekly auto-backup worker.
- Export: XLSX with rounded VAT and category breakdown.
- Updater: signed Tauri updater config, GitHub private token support.
- Release pipeline: GitHub Actions builds signed Windows installer from `v*` tags.

---

## Current Release State

Source version is `0.2.3` in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Pre-release QA fixed:

- Supabase env included in GitHub Actions release builds.
- Dashboard totals SQL ambiguity fixed.
- CSP allows Tauri IPC path access.
- Sync delete now confirms Supabase soft-delete before remote receipt photo deletion.
- `parseGreekAmount("1.234")` now parses as `1234`.
- VAT and export sums round to 2 decimals.
- Stronghold read/write/remove fallback to localStorage on failure.

Before shipping a public/manual installer, create/push tag `v0.2.3`, wait for GitHub Actions release, install that artifact, then smoke test updater.

---

## Code Conventions

- TypeScript strict, no `any`.
- Functional components and hooks only.
- Named exports for components.
- Use `@/` imports.
- Async/await; no `.then()` chains in app code.
- User-facing strings in Greek.
- No `console.log` in production code. `console.error`/`console.warn` only for real error handling.
- All DB writes go through helpers in `src/lib/*`; components should not run raw SQL writes.
- Every syncable mutation queues outbox.
- UUIDs client-side via `uuid()` helper.
- ISO timestamps via `now()` helper.

---

## UI Rules

- Palette: charcoal, gold, cream, income green, expense red. Do not add random colors.
- Mobile-first at 375px.
- Cards use borders and sand/cream backgrounds, not drop shadows.
- Use lucide icons for icon actions.
- No landing pages inside the app. Build usable screens.
- BrandMark stays `◆ Finance`.

---

## Security Rules

- Never ask for or store Supabase `service_role`.
- Do not print secrets or tokens.
- GitHub updater token is a user-provided read-only token for the private repo and is stored locally through Stronghold-backed storage.
- Stronghold currently uses an app static password. This is acceptable for v0.2 single-user, but review for v1.0 if threat model changes.
- Repo stays private.

---

## Common Commands

```bash
corepack pnpm install
corepack pnpm tauri:dev
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
cargo check
```

Release:

```bash
git tag v0.2.3
git push origin v0.2.3
```

The `release.yml` workflow creates the signed GitHub Release and `latest.json`.

---

## Key Files

| Path | Purpose |
|---|---|
| `src/App.tsx` | Router + app workers |
| `src/pages/Dashboard.tsx` | Dashboard container |
| `src/pages/Settings.tsx` | Settings container |
| `src/components/settings/*` | Settings section components |
| `src/components/dashboard/*` | Dashboard section components |
| `src/components/forms/FinanceFormFields.tsx` | Shared finance form controls |
| `src/lib/transactions.ts` | Transaction CRUD + totals |
| `src/lib/sync.ts` | Custom Supabase sync engine |
| `src/lib/secureAuthStorage.ts` | Stronghold-backed auth storage |
| `src/lib/updater.ts` | GitHub private updater check |
| `src/lib/export.ts` | XLSX export |
| `src-tauri/tauri.conf.json` | Tauri app config, updater, CSP |
| `.github/workflows/release.yml` | Signed release workflow |

---

## Known Follow-ups

- Split more shared logic from `sync.ts` and long forms only when there is time for regression testing.
- Review Stronghold password strategy for v1.0.
- Consider further chart bundle optimization if cold start becomes measurable.
- Keep `README.md`, `AGENTS.md`, and this file aligned after release-state changes.

---

## Communication

Reply to Heraklis in Greek. Be concise, concrete, and honest. If a change risks data loss, security, or release stability, say it directly before proceeding.
