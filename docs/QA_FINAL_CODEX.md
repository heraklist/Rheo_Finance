# QA Final Report — CODEX — 2026-05-11

## Συνοπτικά

Το app είναι κοντά σε usable single-user state, αλλά δεν είναι production-ready για release build σήμερα. Το σημαντικότερο blocker είναι ότι το Tauri desktop build αποτυγχάνει στο τρέχον Windows setup επειδή το `beforeBuildCommand` καλεί `pnpm` ενώ διαθέσιμο είναι μόνο `corepack pnpm`. Τα data integrity checks στο πραγματικό local DB ήταν καθαρά, και το frontend/Rust compile περνάει, αλλά υπάρχουν high-risk θέματα σε book switching, amount parsing και sync conflict semantics.

- Critical findings: 1
- High findings: 4
- Medium findings: 5
- Low findings: 3

Δεν διάβασα το `docs/QA_FINAL_CLAUDE_CODE.md`.

## Build Health

- `corepack pnpm install`: pass, already up to date.
- `corepack pnpm typecheck`: pass, 0 errors.
- `corepack pnpm lint`: pass, Biome checked 61 files.
- `corepack pnpm build`: pass, Vite built successfully.
- `cargo check` in `src-tauri`: pass.
- `corepack pnpm tauri build --debug`: fail, `pnpm` not recognized by Tauri `beforeBuildCommand`.
- `corepack pnpm tauri dev`: fail without shim for same `pnpm` reason; with temporary PATH shim it ran until timeout without captured fatal error, but I did not confirm UI manually.

Build warning:

- Vite output has one large JS chunk: `assets/index-kdLgNL0B.js` = 1,055.98 kB minified, 304.94 kB gzip.

## Findings — Critical

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| C1 | Release build | Tauri build/dev commands are not reproducible in this environment. `corepack pnpm tauri build --debug` fails because Tauri runs `beforeBuildCommand` as `pnpm build`, but `pnpm` is not installed as a global command. This blocks desktop release artifact generation unless the machine has a global pnpm shim. | `src-tauri/tauri.conf.json:7`, `src-tauri/tauri.conf.json:9` | Run `corepack pnpm tauri build --debug`; observed `beforeBuildCommand \`pnpm build\` failed` and `'pnpm' is not recognized`. |

## Findings — High

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| H1 | Book switching | Dashboard and Transactions list ignore the persisted `currentBookId` and hardcode `book-business`. Add Transaction uses the store, so personal entries can be created but then not shown consistently on dashboard/list after switching to personal. | `src/pages/Dashboard.tsx:65`, `src/pages/TransactionsList.tsx:20`, `src/pages/TransactionsList.tsx:120` | Set preferred book to personal in Settings, add a personal transaction, then open Dashboard or Transactions. Queries still use business. |
| H2 | Amount validation | Transaction amount parsing accepts malformed values. `12abc` becomes `12`, and Greek thousands input `1.000,50` becomes `1`, silently corrupting financial data. | `src/components/transactions/TransactionForm.tsx:174` | Node check: `Number.parseFloat("12abc".replace(",", ".")) -> 12`; `Number.parseFloat("1.000,50".replace(",", ".")) -> 1`. |
| H3 | Sync conflict semantics | The implementation is "last push wins", not the documented "last edit wins". Remote upsert does not compare `local_updated_at`/`server_updated_at`, so an older offline edit pushed later can overwrite a newer edit from another device. | `src/lib/sync.ts:411`, `src/lib/sync.ts:475` | Edit same transaction on two offline devices, push newer edit first, then push older edit later. Later push overwrites remote because no timestamp conflict check is applied. |
| H4 | Auto backup | Settings exposes "Εβδομαδιαίο auto-backup", but the checkbox only persists a preference. No worker/scheduler calls `createJsonBackup()` automatically. This gives false confidence for backups. | `src/pages/Settings.tsx:334`, `src/pages/Settings.tsx:338` | Enable weekly auto-backup, restart/use app; no scheduled backup path exists in hooks or App startup. |

## Findings — Medium

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| M1 | Updater signing | Tauri updater is enabled with endpoint/dialog, but `pubkey` is empty. For production-bound releases, update verification is incomplete or updater behavior will fail when activated. | `src-tauri/tauri.conf.json:48`, `src-tauri/tauri.conf.json:51` | Inspect `tauri.conf.json`; `plugins.updater.pubkey` is `""`. |
| M2 | Local VAT precision | Local `computeVat()` stores unrounded floating values. For `0.10` at 6%, VAT is `0.005660377...`, not a cent-rounded amount. UI rounds on display, but DB/export can carry non-cent precision. | `src/lib/utils.ts:65` | Node check for gross `0.10`, rate `0.06`: net `0.0943396226`, VAT `0.0056603773`. |
| M3 | Tauri permissions | Default capability grants broad `fs:default`, `sql:default`, `sql:allow-execute`, and `sql:allow-select`. CSP helps, but a webview injection would have broad local data access. Scope should be reduced before production hardening. | `src-tauri/capabilities/default.json:10`-`src-tauri/capabilities/default.json:16` | Inspect capability file. |
| M4 | Dashboard analytics | Dashboard chart still uses mock month buckets and only fills the current month from totals. It does not show real 12-month income/expense history. | `src/pages/Dashboard.tsx:88` | Add historical transactions in previous months; dashboard chart remains zero for non-current months. |
| M5 | Android release | SESSION_011 produced an arm64 debug APK, but no real-device sideload/QA was completed and release signing is not configured. | `docs/ANDROID_BUILD_NOTES.md` | `adb devices -l` returned no attached devices during SESSION_011. |

## Findings — Low

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| L1 | Bundle size | Main JS chunk exceeds Vite's 500 kB warning threshold. Not a blocker for desktop, but worth code-splitting charts/settings/export later. | Build output | Run `corepack pnpm build`. |
| L2 | Brand conventions | Dashboard empty state uses a decorative emoji, which conflicts with the project anti-patterns. | `src/pages/Dashboard.tsx:171` | Inspect empty state markup. |
| L3 | Runtime smoke coverage | Native `tauri dev` UI was not manually verified in this run because the first run failed on `pnpm`, and the shimmed run timed out without usable captured UI evidence. | QA process | Re-run after fixing C1 and manually verify native window startup. |

## Functional Test Outcomes

| Feature | Pass/Fail | Notes |
|---|---|---|
| Auth | Skipped | Requires live Supabase session/credentials. Code path reviewed; password + MFA components exist. |
| Transaction CRUD | Partial | Code supports create/edit/delete and DB has 2 synced transactions. Manual UI not verified in this run. |
| Book switching | Fail | Dashboard/list hardcode business book. |
| Search & filters | Partial | Code uses SQL filters and debounce. Amount filter uses same loose parsing style as transaction form. |
| Sync | Partial / risk | Outbox push/pull exists; current DB has 0 pending outbox rows. Conflict semantics are weaker than documented. |
| Receipts | Partial | Local save/upload/download code exists; real file/photo flow not manually verified. |
| Recurring | Partial | Generation code exists with duplicate guard; UI/manual generation not verified. |
| Export | Partial | XLSX generation code exists; native save dialog not exercised. |
| Backup | Partial / fail for auto | Manual backup code exists; auto-backup checkbox is not implemented. |
| Android | Partial | Debug APK built; no real-device sideload. |

## Edge Cases Tested

| Edge case | Result | Notes |
|---|---|---|
| Amount `0,01` | Pass | Parses to `0.01`. |
| Amount `999999,99` | Pass | Parses to `999999.99`. |
| Amount `abc` | Pass | Parses to `NaN` and validation rejects. |
| Negative amount | Pass | Parses negative and validation rejects. |
| Amount `12abc` | Fail | Accepted as `12`. |
| Amount `1.000,50` | Fail | Accepted as `1`. |
| VAT 6% tiny amount | Risk | Stored VAT/net are unrounded floats. |
| Description empty | Pass by current requirement | Empty description falls back to selected category name. |
| Tag whitespace | Pass | `findOrCreateTag()` trims and returns null for empty. |
| Notes empty | Pass | Saved as `null`. |
| No category/account | Pass | Validation blocks save. |
| Greek tag/search path | Partial | SQL uses `LOWER(... LIKE ...)`; not manually verified with Greek collation edge cases. |
| Double save | Partial | `submitting` guard exists. |

## Data Integrity SQL Audit

Read-only queries ran against:

`C:\Users\herax\AppData\Roaming\gr.evochia.finance\evochia.db`

Results:

- VAT delta > 0.01: 0 rows.
- Orphan transactions: 0 rows.
- Stale outbox entries with attempts > 3 and age > 1h: 0 rows.
- Duplicate transaction primary keys: 0 rows.
- Transaction sync status counts: `synced = 2`.
- Outbox counts: 0 rows.

## Performance

Performance test ran on a copied DB at `C:\tmp\evochia_qa_perf.db`, then deleted the copy. 1000 generated transactions were inserted into the copy only.

- Insert 1000 rows: 32.65 ms.
- Recent 200 query: 0.92 ms.
- Search `"perf test"` query: 0.80 ms.
- Date filter query: 0.28 ms.
- Dashboard totals query: 0.73 ms.

SQLite query performance is good at 1000 rows. UI scroll/render performance was not manually measured.

## Recommended Fixes Πριν Release

Critical pre-release:

- Fix Tauri `beforeDevCommand` / `beforeBuildCommand` to work without global pnpm, e.g. use `corepack pnpm dev` and `corepack pnpm build`, or ensure a committed/reproducible pnpm shim in the environment.

High pre-release:

- Replace hardcoded `book-business` in Dashboard/TransactionsList with `currentBookId`.
- Replace loose amount parsing with strict Greek-aware money parsing and reject malformed input.
- Either implement true edit-time LWW conflict handling or document the current "last push wins" behavior in UI/docs.
- Remove or implement weekly auto-backup.

Medium before broad production use:

- Configure updater signing `pubkey` or disable updater until signed release infrastructure exists.
- Round VAT/net to cents consistently for local DB/export.
- Tighten Tauri capabilities around filesystem and SQL.
- Replace mock dashboard chart with real monthly grouped data.
- Complete real Android sideload and release signing.

## Open Questions

- Θέλουμε να διορθωθούν τα Critical/High τώρα σε ένα corrective session πριν FINAL_RELEASE;
- Για sync conflict, κρατάμε πραγματικό LWW με `local_updated_at` ή αποδεχόμαστε "last push wins" επειδή είναι single-user;
- Το weekly auto-backup πρέπει να γίνει πραγματικό scheduler ή να αφαιρεθεί από UI μέχρι να υλοποιηθεί;
