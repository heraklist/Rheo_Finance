# QA Final Report - CODEX - 2026-05-13

## Συνοπτικά

Το app είναι buildable και ξεκινά σε Tauri dev/debug build χωρίς compile blocker. Για production release δεν το θεωρώ ακόμη fully clean: υπάρχει ένα High data-integrity finding επειδή το πραγματικό SQLite connection έχει `PRAGMA foreign_keys = 0`, άρα τα foreign keys του schema δεν επιβάλλονται runtime. Τα βασικά security scans είναι καθαρά, αλλά το updater δεν είναι configured και το auth session μένει σε localStorage, που θέλουν explicit release decision.

- Critical findings: 0
- High findings: 1
- Medium findings: 3
- Low findings: 2

## Post-QA Decisions - 2026-05-13

- H1 FK enforcement: fixed in `src/lib/db.ts` by enabling and verifying `PRAGMA foreign_keys = ON` when the SQLite connection is created.
- Updater: moved to v0.2.0 scope. v0.1.0 can proceed without auto-update infrastructure if needed.
- Stronghold/keychain auth storage: moved to v0.2.0 scope. Current localStorage session remains an accepted interim implementation until that hardening session.
- Authenticated native QA: still required before tagging a release candidate.

## v0.2.0 Hardening Update - 2026-05-13

- H1 FK enforcement: implemented and verified in `src/lib/db.ts`.
- M1 updater: Tauri updater plugin is installed, registered on desktop, exposed from Settings, configured with the generated public key + production endpoint, and release artifacts are signed.
- M2 auth storage: Supabase auth persistence now uses Tauri Stronghold on desktop, with migration from existing WebView localStorage tokens on first read.
- Version bump: app/package/Cargo/Tauri config moved to `0.2.0`.
- Verification: `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, `cargo check`, `corepack pnpm tauri build --debug`, and signed `corepack pnpm tauri build` pass. Release installer and signature built under `src-tauri/target/release/bundle/nsis/`.

## Build Health

| Check | Result | Notes |
|---|---:|---|
| `corepack pnpm install` | Pass | Already up to date. Warning: `[ERR_PNPM_META_FETCH_FAIL] GET https://registry.npmjs.org/pnpm: fetch failed`, exit code 0. |
| `corepack pnpm typecheck` | Pass | `tsc --noEmit`, 0 errors. |
| `corepack pnpm lint` | Pass | Biome checked 67 files, 0 errors. |
| `corepack pnpm build` | Pass | Vite production build success. |
| `cargo check` | Pass | `Finished dev profile`, 0 errors. |
| `corepack pnpm tauri build --debug` | Pass | Built exe and NSIS debug installer: `src-tauri/target/debug/bundle/nsis/Evochia Finance_0.2.0_x64-setup.exe`. |

## Static Security

| Check | Result | Notes |
|---|---:|---|
| Hardcoded secrets in `src` / `src-tauri/src` | Pass | No `service_role`, `sk_live`, `sk_test`, obvious `password =` matches. |
| Tracked `.env` files | Pass | No tracked `.env*`. `.env.local` exists but is ignored by `.gitignore:23`. |
| CSP | Pass | `src-tauri/tauri.conf.json:28` has non-null CSP scoped to self, Supabase, asset/blob image sources. |
| Updater pubkey | Medium | No updater plugin/config/pubkey present in `src-tauri/tauri.conf.json`. |
| `console.log` | Pass | No matches in `src`. |
| `: any` | Pass | No matches in `src`. |
| TODO | Pass | No matches in `src`. |

## Findings - Critical

None found.

## Findings - High

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| H1 | Data integrity | SQLite foreign keys are defined in schema but not enforced on the real DB connection. This allows orphan rows if a sync tombstone, import, or future helper bug deletes referenced books/accounts/categories/templates. | `src/lib/db.ts:12`, `src-tauri/migrations/0001_initial.sql:119` | Open `%APPDATA%/gr.evochia.finance/evochia.db` read-only and run `PRAGMA foreign_keys;`. Actual result: `0`. |

Recommended fix: after `Database.load("sqlite:evochia.db")`, enable and verify FK enforcement for the connection, e.g. execute `PRAGMA foreign_keys = ON` and confirm `PRAGMA foreign_keys` returns `1`. Add a small runtime/dev assertion or integration check.

## Findings - Medium

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| M1 | Release operations | Auto-updater is not configured. No updater plugin, endpoint, or public key exists. This is fine only if v0.1.0 is intentionally manual installer/sideload. | `src-tauri/tauri.conf.json:47` | `rg -n "updater|pubkey|tauri-plugin-updater"` returns no matches. |
| M2 | Auth/session storage | Supabase session persists in WebView localStorage. This is workable for early single-user use, but not OS keychain/Stronghold-level protection for finance data. | `src/lib/supabase.ts:12` | `createClient(..., { auth: { persistSession: true } })` with default storage. |
| M3 | QA coverage | Full authenticated functional CRUD/sync QA was not completed by this agent because no test credentials/native app automation surface were available. | N/A | Tauri runtime starts, but sign-in, CRUD, sync, recurring flows require an authenticated native session/manual pass. |

## Findings - Low

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| L1 | Tooling/network | `pnpm install` returned success but printed registry metadata fetch warning under restricted network. | N/A | Run `corepack pnpm install`. |
| L2 | Browser-only dev mode | Opening protected routes in a normal browser with an existing Supabase session causes Tauri SQL IPC errors (`invoke` undefined). This is expected for non-Tauri browser mode, but it makes browser-only QA unreliable after login. | `src/lib/db.ts:12` | Open `http://localhost:1420/` in normal browser with persisted auth session, outside Tauri. |

## Functional Test Outcomes

| Feature | Result | Notes |
|---|---:|---|
| Tauri startup | Pass | `pnpm tauri:dev` compiled and launched `target/debug/evochia-finance.exe`. |
| Login page rendering | Pass | Browser smoke on `/login`: title `Finance - Evochia`, no console errors, form visible. |
| Auth sign-in/sign-out | Skipped | No test credentials provided for this fresh QA pass. |
| Transaction CRUD | Skipped | Requires authenticated native session. Static review shows amount parser and optional description path are wired. |
| Book switching | Static pass | Dashboard/list/recurring/form use current book state; manual cross-book data verification skipped. |
| Search & filters | Static pass | Amount filters use `parseGreekAmount`; manual UI verification skipped. |
| Sync | Skipped | Requires Supabase authenticated session and remote data. |
| Recurring | Static pass | Worker/form exist; manual generation pass skipped. |
| Receipt photo | Static pass with caveat | Uses Tauri dialog/fs APIs and app-data `receipts/`; native manual camera/file test skipped. |

## Edge Cases Tested

| Area | Result | Notes |
|---|---:|---|
| Amount parsing | Static pass | `parseGreekAmount` rejects malformed patterns like `12abc`, `1,2,3`, `1..5`; validates Greek thousands grouping. |
| Tiny VAT | Static pass | `computeVat` rounds to 2 decimals. |
| Negative/zero amount | Static pass | Forms reject `grossNum === null || grossNum <= 0`. |
| Empty transaction description | Pass | Current behavior is optional description with category fallback, matching Heraklis's request. |
| Empty recurring description | Pass | Still required for recurring templates. |
| Whitespace tag | Pass | `findOrCreateTag` trims and returns `null` for blank. |
| Tag case dedupe | Pass | Lookup uses `LOWER(name) = LOWER(?)`. |
| Double submit | Static pass | Transaction/recurring forms guard with `if (submitting) return`. |
| Greek copy/search | Static pass | Search lowercases description/category/tag; manual Greek UI search skipped. |
| Responsive UI | Skipped | No native screenshot pass in this QA run. |

## Data Integrity SQL Audit

DB audited read-only:

`C:/Users/herax/AppData/Roaming/gr.evochia.finance/evochia.db`

| Query | Result |
|---|---:|
| `PRAGMA foreign_keys` | `0` - High finding H1 |
| transactions count | 0 |
| sync_outbox count | 0 |
| categories count | 35 |
| recurring_templates count | 0 |
| VAT inconsistency (`gross != net + vat`, tolerance 0.01) | 0 rows |
| Orphan transaction category/account/book | 0 rows |
| Stale outbox (`attempts > 3`, older than 1h) | 0 rows |
| Duplicate transaction PK | 0 rows |
| Pending transactions vs transaction outbox | 0 / 0 |

Because there are currently 0 transactions, the VAT/orphan checks are clean but low-signal. Re-run after real CRUD test data exists.

## Performance

I did not mutate the real app DB for the 1000-row test. I copied it to `C:/tmp/evochia_perf_qa.db`, inserted 1000 synthetic transactions, benchmarked core SQL, then deleted the temp DB.

| Operation on temp copy | Result |
|---|---:|
| Insert 1000 rows | 16.911 ms |
| List first 100 transactions | 0.760 ms |
| Search `perf test` | 2.327 ms |
| Dashboard totals | 0.800 ms |
| Monthly totals | 2.676 ms |

SQL-side performance is fine at 1000 rows. UI load/scroll FPS was not measured because it needs an authenticated native session with test data.

## Recommended Fixes Before Release

- High: Enable SQLite FK enforcement per connection and verify `PRAGMA foreign_keys = 1`.
- Medium: Decide whether v0.1.0 ships with manual installer only or restore Tauri updater config with signing pubkey.
- Medium: Decide whether localStorage Supabase session is acceptable for v0.1.0 or move auth storage to Stronghold/keychain.
- QA: Run one authenticated native smoke pass: sign in, create/edit/delete transaction, switch book, sync now, create/toggle recurring, receipt photo save/open.

## Open Questions

- Is auto-update required for v0.1.0, or is manual installer/sideload the intended release path?
- Do you want keychain/Stronghold session storage before real production data, or is localStorage accepted for the private first release?
- Can you provide a temporary test login or run the native authenticated checklist manually so the skipped CRUD/sync rows become pass/fail?
