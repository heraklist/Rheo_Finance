# CLAUDE.md

> Auto-loaded context για Claude Code. Διάβασε πριν γράψεις κώδικα. Το project δεν είναι Day 1 scaffold πλέον.

---

## TL;DR

**Project:** Rheo Finance — Tauri 2 desktop + Android app για διαχείριση
οικονομικών independent professionals (freelancers, creators, small business).

**Story:** Independent Rheo product for local-first finance workflows.

**Owner:** Heraklis, Greek-speaking, με dev background. Θέλει concrete deliverables, όχι ατελείωτο planning.

**Current state:** Rheo Finance v0.2.13. Πλήρες desktop app με SQLite local DB, Supabase Auth/Sync/Storage, password login + TOTP MFA, receipt photos, category CRUD, dashboard filters, recurring, VAT, forecast, Excel export, backup, native secure auth storage και GitHub private updater token. Android arm64 Rust build works locally; full APK packaging on Windows needs symlink privilege.

**Repo:** `github.com/heraklist/Rheo_Finance` private.

**App identifier/package:** `app.rheo.finance`.

**BrandMark locked:** `◆ Rheo`. Μην το αλλάξεις.

---

## Reading order

1. `AGENTS.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/Evochia_Finance_Project_Plan_v1.1.md` (legacy name, content still valid)
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
| Secure local auth storage | Native secure storage on Windows/Android; Stronghold legacy-read migration |
| Distribution | Manual sideload + signed GitHub Releases |
| Updater | GitHub Releases `latest.json`; private repo uses user-provided read token |
| App identifier/package | `app.rheo.finance` |
| Repo visibility | Private |
| Brand mark | `◆ Rheo` |
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
- Updater: signed Tauri updater config, GitHub private token support, desktop install flow, Android assisted-update manifest.
- Android: arm64 debug APK builds; auth tokens use Android Keystore-backed native storage, while updater installation remains assisted sideload.
- Release pipeline: GitHub Actions builds signed Windows installer, signed Android APK, `latest-desktop.json`, legacy `latest.json`, and `latest-android.json` from `v*.*.*` tags.

---

## Current Release State

Source version is `0.2.13` in:

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Pre-release QA fixed:

- Supabase env included in GitHub Actions release builds.
- Dashboard totals SQL ambiguity fixed.
- CSP allows Tauri IPC, Supabase sync, and private GitHub updater API access.
- Sync delete now confirms Supabase soft-delete before remote receipt photo deletion.
- `parseGreekAmount("1.234")` now parses as `1234`.
- VAT and export sums round to 2 decimals.
- Auth storage uses native secure storage on Windows/Android, with legacy Stronghold/localStorage migration only.
- Android build includes the native secure auth storage plugin; full local APK packaging still depends on Windows symlink privilege or CI/Linux.

Before shipping a public/manual installer, create/push tag `v0.2.13`, wait for GitHub Actions release, install that artifact, then smoke test updater.

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
- BrandMark stays `◆ Rheo`.

---

## Security Rules

- Never ask for or store Supabase `service_role`.
- Do not print secrets or tokens.
- GitHub updater token is a user-provided read-only token for the private repo and is stored locally through native secure storage on Windows/Android.
- Legacy Stronghold storage is read only for migration; do not add new Stronghold/localStorage token write paths.
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
git tag v0.2.13
git push origin v0.2.13
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
