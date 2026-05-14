# QA Final Report - CODEX - 2026-05-14

Fresh QA audit before v0.2.0 release. I did not use the previous QA reports as input.

## Verdict

**App code/build: PASS.**

**Release with updater: NOT READY until GitHub release assets are uploaded and authenticated updater smoke passes.**

The desktop app builds, typechecks, lints, starts, has a signed installer artifact, and the local SQLite integrity/performance checks are clean. The updater no longer depends on `finance.evochia.gr`; it is configured to read GitHub Releases via `latest.json`. Because the repo is private for now, the app supports a locally stored GitHub updater token from Settings.

## Findings

### H1 - GitHub updater feed is not published yet

- File: `src-tauri/tauri.conf.json:53`
- Token support: `src/lib/updaterToken.ts`, `src/lib/updater.ts`, `src/pages/Settings.tsx`
- Configured endpoint: `https://github.com/heraklist/evochia_finance/releases/latest/download/latest.json`
- Verification:
  - Tauri v2 supports static GitHub `latest.json` endpoints.
  - Release assets are not yet verified as uploaded/reachable from the installed app.
  - Private repo access is now attempted with a locally stored token sent as an `Authorization: Bearer ...` header.
- Impact: the app can be released manually, but the in-app updater must be smoke-tested with a real GitHub token after the release assets exist.
- Required fix before calling the updater release-ready:
  - Add GitHub Actions secrets `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
  - Run `.github/workflows/release.yml` or push a `v0.2.0` tag.
  - Confirm the workflow uploaded `latest.json`, `Evochia Finance_0.2.0_x64-setup.exe`, and `.sig`.
  - In Settings -> About -> Private GitHub updater, save a GitHub token with read access to the private repo.
  - Re-test updater check from the installed desktop app.

### M1 - Stronghold uses a hardcoded snapshot password

- File: `src/lib/secureAuthStorage.ts:54`
- Related salt setup: `src-tauri/src/lib.rs:38`
- Current state: Supabase auth session is stored via Tauri Stronghold, not plain localStorage in desktop runtime.
- Risk: the snapshot password string ships in the app bundle. Stronghold still protects better than browser localStorage, but it is not OS/user-secret bound. A local attacker with the snapshot, salt, and app bundle can plausibly derive the same key.
- Recommendation: for v0.2.0, either document this as "Stronghold-backed local encrypted storage" without overclaiming, or derive the password from a user/OS-held secret before treating it as strong local credential protection.

### L1 - Invalid amount filters are silently ignored - fixed

- File: `src/pages/TransactionsList.tsx:62`, `src/pages/TransactionsList.tsx:275`, `src/pages/TransactionsList.tsx:294`
- Current state: transaction form amount parsing is strict and shows an error. Filter min/max amounts now keep draft strings and show visible validation errors for malformed values or min > max.
- Impact: fixed in code; verify manually with `12abc`, `1,2,3`, and `1..5`.

## Checkpoints

### 1. Build health

All required build gates passed:

- `corepack pnpm install` -> pass, already up to date.
- `corepack pnpm typecheck` -> pass.
- `corepack pnpm lint` -> pass, Biome checked 69 files.
- `corepack pnpm build` -> pass, Vite production build complete.
- `cargo check` in `src-tauri` -> pass.

Release artifacts present:

- `src-tauri/target/release/bundle/nsis/Evochia Finance_0.2.0_x64-setup.exe`
- `src-tauri/target/release/bundle/nsis/Evochia Finance_0.2.0_x64-setup.exe.sig`

### 2. Static security analysis

Pass:

- No tracked `.env`, `.key`, `.pem`, `.p12`, `.db`, or `.sig` files found by `git ls-files` scan.
- `.env.local`, `dist/`, `node_modules/`, `src-tauri/target/`, local DB files are gitignored.
- No `service_role` key pattern found in source.
- Tauri CSP is configured at `src-tauri/tauri.conf.json:28`; no `unsafe-eval`.
- Updater `pubkey` is present at `src-tauri/tauri.conf.json:54`.
- Tauri updater artifacts enabled at `src-tauri/tauri.conf.json:34`.
- No TypeScript `any`, `@ts-ignore`, `TODO`, `FIXME`, `console.log`, `console.debug`, or `console.info` found in app source. Expected `console.warn` for sync LWW and `console.error` for failures remain.

Notes:

- `style-src 'unsafe-inline'` remains in CSP. This is acceptable for the current React/Tauri styling path, but keep it scoped to this need.
- `updater:default` grants the full update workflow. Acceptable if updater endpoint is trusted and signed, but endpoint must be live first.

### 3. Runtime smoke

Pass with dev-process caveat:

- `corepack pnpm tauri dev` started Vite on `http://localhost:1420/`.
- A Tauri process `evochia-finance.exe` opened with window title `Finance`.
- Duplicate dev run failed with `os error 5` because the first dev instance still held `src-tauri/target/debug/evochia-finance.exe`. I terminated the spawned dev app process and verified no `evochia-finance` process remained.

This is not a product runtime bug; it is the normal Windows file-lock behavior when rebuilding while an existing debug exe is still running.

### 4. Functional happy path

Static/code verification pass:

- Password login + MFA routes are wired through Supabase auth.
- Supabase session storage uses `secureAuthStorage`.
- Transaction form:
  - Description is optional and falls back to category name.
  - Strict Greek amount parser is used.
  - VAT hidden for personal book and forced to 0.
  - VAT label changes to `ΦΠΑ (εισροών)` / `ΦΠΑ (εκροών)`.
- Dashboard:
  - Uses current/default book plus book popover.
  - Uses real monthly aggregation via `getMonthlyTotals`.
- Transactions list:
  - Uses `currentBookId`.
  - Search/filter query goes through helpers.
- Recurring:
  - Uses current book.
  - Uses strict amount parser.
  - VAT hidden for personal book.
- Category CRUD:
  - Create/update/archive/delete helpers exist.
  - Delete has FK usage guard.

Manual limitation in this QA run:

- The real local DB currently has 0 transactions and 0 recurring templates, so I could not re-run a complete UI CRUD/sync happy path against existing real data without creating new user data.

### 5. Edge cases

Verified:

- `parseGreekAmount("12abc")` -> invalid.
- `parseGreekAmount("1,2,3")` -> invalid.
- `parseGreekAmount("1..5")` -> invalid.
- `parseGreekAmount("1.000,50")` -> `1000.5`.
- `parseGreekAmount("1 234,56 €")` -> `1234.56`.
- `computeVat(0.10, 0.06)` -> `{ net: 0.09, vat: 0.01 }`.
- `computeVat(100, 0.24)` -> `{ net: 80.65, vat: 19.35 }`.

### 6. Data integrity SQL audit

Real local DB:

- Path: `C:\Users\herax\AppData\Roaming\gr.evochia.finance\evochia.db`
- Counts:
  - books: 2
  - accounts: 6
  - categories: 35
  - tags: 0
  - recurring_templates: 0
  - transactions: 0
  - sync_outbox: 0
  - sync_metadata: 4
- Checks:
  - `PRAGMA foreign_key_check`: 0 rows.
  - Orphan transaction book/account/category: 0.
  - Transaction account/category book mismatch: 0.
  - Personal-book VAT nonzero rows: 0.
  - Bad amount rows: 0.
  - VAT net/gross mismatch rows: 0.
  - Outbox pending/errors: 0.
- `last_synced_at`: `2026-05-12T04:14:29.894Z`

### 7. Performance smoke

Synthetic temp DB with seed + 10,000 transactions:

- Insert 10k rows: 69.16 ms.
- Monthly totals 12m query: 6.44 ms.
- Recent 50 transactions query: 0.42 ms.
- Search-like query: 6.09 ms.
- Current-month dashboard totals: 0.25 ms.

Result: current indexes are enough for v0.2 scale.

## Release Decision

Do not publish v0.2.0 as an updater-enabled release until H1 is smoke-tested with the private GitHub token flow.

Safe path:

1. Create a GitHub release, e.g. `v0.2.0`.
2. Or run `.github/workflows/release.yml` with the signing secrets configured.
3. Confirm the signed installer, `.sig`, and `latest.json` are attached.
4. Save a GitHub token in Settings -> About -> Private GitHub updater.
5. Confirm the installed app can read the release feed and reports no update for v0.2.0 clients.
6. For future v0.2.1, confirm an older installed client sees the update.
7. Then publish the installer.

If the installer is distributed manually without promising in-app updates yet, the app code itself is a viable release candidate.
