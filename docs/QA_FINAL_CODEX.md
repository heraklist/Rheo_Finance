# QA Final Report - CODEX - 2026-05-12

## Συνοπτικά

Το build health είναι καθαρό, αλλά δεν το θεωρώ production-ready ακόμα. Υπάρχει release blocker στο sync cursor: το `pullChanges()` μπορεί να προχωρήσει το `last_synced_at` ακόμα και μετά από partial pull failure ή με client clock που προηγείται του server, άρα υπάρχει κίνδυνος να μη ξανατραβηχτούν remote αλλαγές. Επίσης τα remote deletes δεν αναπαράγονται σε άλλες συσκευές χωρίς tombstones/soft-delete. Πριν από release θέλει fix-up session για sync.

- Critical findings: 1
- High findings: 1
- Medium findings: 1
- Low findings: 1

## Build health

| Check | Result | Notes |
|---|---:|---|
| `corepack pnpm install --frozen-lockfile` | Pass | Lockfile already up to date |
| `corepack pnpm typecheck` | Pass | `tsc --noEmit` clean |
| `corepack pnpm lint` | Pass | Biome checked 63 files, no fixes |
| `corepack pnpm build` | Pass | Vite build success |
| `cargo check` in `src-tauri` | Pass | Rust compile check clean |
| `corepack pnpm tauri dev` | Partial | Native dev launched processes and no `pnpm not recognized`; command timed out after 74s without captured app logs, then processes were stopped |

Build warning captured:

- Vite reports `assets/index-BM1fuRjd.js` at about `1,061.61 kB` / gzip `306.91 kB`, above the 500 kB chunk warning threshold.

## Static security checks

| Check | Result | Notes |
|---|---:|---|
| Hardcoded secrets scan | Pass | No `service_role`, `sk_live`, `sk_test`, obvious password assignment matches in `src` / `src-tauri/src` |
| Tracked `.env*` files | Pass | No tracked `.env.local` or similar |
| CSP | Pass | `src-tauri/tauri.conf.json:28` has a non-null CSP |
| Updater pubkey | Medium | `src-tauri/tauri.conf.json:51` is empty |
| `console.log` scan | Pass | No production `console.log` in `src` |
| `: any` scan | Pass | No direct `: any` in TS/TSX scan |
| TODO scan | Pass | No TODO markers in `src` TS/TSX scan |
| Tauri capabilities | Pass static | `src-tauri/capabilities/default.json` no longer uses broad `fs:default` / `sql:default` |

Note on dialog + filesystem scope: exports and receipt imports use Tauri dialog-selected paths. Tauri's dialog API documents that selected save paths are added to filesystem scope for the app session, so I did not flag the narrowed static `fs:scope` as a blocker by itself.

Sources used for this verification:

- Tauri dialog `save()` reference: https://v2.tauri.app/reference/javascript/dialog/
- Tauri filesystem scope reference: https://v2.tauri.app/plugin/file-system/

## Findings - Critical

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| C1 | Sync pull cursor | `pullChanges()` continues after a per-table Supabase pull error, then writes `last_synced_at = now()`. It also uses local client time instead of max successfully-applied remote `updated_at`. A transient table failure or clock skew can advance the cursor past remote rows that were never applied, so future pulls skip them permanently. | `src/lib/sync.ts:575`, `src/lib/sync.ts:590` | 1. Have remote rows updated after current `last_synced_at`. 2. Make one table pull fail while another succeeds. 3. Run sync. 4. Observe `last_synced_at` advances anyway. 5. Restore network; rows from failed table with `updated_at <= new last_synced_at` are not pulled. |

Recommended fix:

- Track whether any table failed; if yes, do not advance `last_synced_at`.
- Prefer per-table cursors or set cursor to the maximum remote `updated_at` that was actually applied.
- Keep a tiny overlap window if using a single cursor, then dedupe by id/timestamp.

## Findings - High

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| H1 | Sync deletes | Remote deletes are physically deleted from Supabase and cannot be pulled by another device. `deleteTransaction()` deletes local row and queues a remote delete; `pushChanges()` executes `.delete()`. `pullChanges()` only selects existing rows by `updated_at`, so other devices keep stale local transactions forever. | `src/lib/transactions.ts:358`, `src/lib/transactions.ts:368`, `src/lib/sync.ts:510`, `src/lib/sync.ts:518`, `src/lib/sync.ts:569` | 1. Device A and B both synced. 2. Delete transaction on A. 3. A pushes delete to Supabase. 4. Sync B. 5. B has no remote tombstone row to pull, so stale transaction remains. |

Recommended fix:

- Add `deleted_at` / `is_deleted` tombstones to synced tables, or a dedicated `sync_deletions` table.
- Pull tombstones newer than the cursor and delete/mark local rows.
- Hard-delete only after all devices are beyond retention, or never hard-delete during v0.1.

## Findings - Medium

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| M1 | Updater signing | Updater is configured with endpoint + dialog, but `pubkey` is empty. If updater stays enabled in production, signed update verification is not release-ready. | `src-tauri/tauri.conf.json:47`, `src-tauri/tauri.conf.json:51` | Inspect `src-tauri/tauri.conf.json`; `"pubkey": ""`. |

Recommended fix:

- Generate Tauri signer key, securely store private key, set public key before release.
- If no updater for v0.1.0, disable updater config rather than shipping an empty key path.

## Findings - Low

| # | Area | Description | File:Line | Repro steps |
|---|---|---|---|---|
| L1 | Bundle size | Production build succeeds but main JS chunk is over 1 MB raw. Not a release blocker for desktop, but startup can improve with route/vendor chunk splitting later. | `vite.config.ts:39` | Run `corepack pnpm build`; Vite emits chunk size warning. |

Recommended fix:

- Add `build.rollupOptions.output.manualChunks` for heavy vendors like `recharts`, `@supabase/supabase-js`, and Radix if startup becomes noticeable.

## Functional test outcomes

| Feature | Result | Notes |
|---|---:|---|
| Native startup | Partial | `tauri dev` launched, but command timed out without app logs; stopped spawned processes cleanly |
| Browser automation | Skipped | Playwright tool could not start because Chrome distribution is missing at `C:\Users\herax\AppData\Local\Google\Chrome\Application\chrome.exe` |
| Web dev server | Pass | `http://localhost:1420/` responded with HTTP 200 |
| Auth | Skipped | Needs interactive browser/native session |
| Transaction CRUD | Skipped | Needs interactive browser/native session |
| Book switching | Source-pass | `Dashboard`, `TransactionsList`, `RecurringForm` use `currentBookId`; no hardcoded `CURRENT_BOOK_ID` found in those paths |
| Amount parsing | Source-pass | `TransactionForm` uses `parseGreekAmount()` and visible `amountError` state |
| VAT visibility/labels | Source-pass | Transaction + recurring forms hide VAT outside business book and use εισροών/εκροών labels |
| Auto-backup | Source-pass | `useAutoBackupWorker()` is wired in `App.tsx` and stores `last_auto_backup_at` through backup helpers |
| Sync | Fail | Critical/high findings above |
| Recurring | Source-pass | `RecurringForm` uses current book, current account/category queries, and book-scoped VAT |
| Export / receipts | Source-pass static | Dialog-selected paths should be session-scoped by Tauri; needs manual native confirmation |

## Edge cases tested

| Edge case | Result | Notes |
|---|---:|---|
| `12abc` amount | Source-pass | Rejected by `parseGreekAmount()` character regex; UI renders `"Μη έγκυρο ποσό. Παράδειγμα: 1.234,56"` |
| `1.000,50` amount | Source-pass | Parses as Greek thousands + decimal, avoiding `parseFloat` truncation |
| Empty amount | Source-pass | Parser returns null; form blocks |
| Negative amount | Source-pass | Parser allows syntax, form rejects `<= 0` |
| VAT `0.10` at `6%` | Source-pass | `computeVat()` rounds `net` and `vat` to 2 decimals |
| Personal book VAT | Source-pass | VAT field hidden and `vatRate` forced to 0 |
| Business income VAT label | Source-pass | `ΦΠΑ (εκροών)` |
| Business expense VAT label | Source-pass | `ΦΠΑ (εισροών)` |
| Dynamic TS function execution | Skipped | `pnpm exec tsx` unavailable; build/typecheck still pass |
| Greek UI visual overflow | Skipped | Browser automation unavailable |

## Data integrity SQL audit

Direct SQL audit was not completed in this run.

- SQLite DB located: `C:\Users\herax\AppData\Roaming\gr.evochia.finance\evochia.db`
- `sqlite3` CLI is not installed.
- `python` execution failed in this Windows session; `py -3` reported no installed Python.
- I did not insert test/performance data into the real DB without a working safe SQL tool and cleanup path.

Required follow-up SQL checks:

```sql
SELECT id, amount_gross, amount_net, amount_vat,
       ABS((amount_net + amount_vat) - amount_gross) AS delta
FROM transactions
WHERE delta > 0.01;

SELECT t.id
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE c.id IS NULL;

SELECT *
FROM sync_outbox
WHERE attempts > 3
  AND datetime(created_at) < datetime('now', '-1 hour');

SELECT id, COUNT(*)
FROM transactions
GROUP BY id
HAVING COUNT(*) > 1;

SELECT sync_status, COUNT(*)
FROM transactions
GROUP BY sync_status;
```

## Performance

The 1000-row runtime performance test was skipped because there was no working SQLite CLI/Python path in this session and browser automation could not launch Chrome. Static/per-build performance signal:

- Vite production build succeeds.
- Main JS chunk is over 1 MB raw; acceptable for desktop v0.1 if startup feels fine, but worth splitting later.

## Recommended fixes πριν release

Critical pre-release:

- Fix `pullChanges()` cursor advancement. Do not advance on partial failure; use max applied remote timestamp or per-table cursors.

High pre-release:

- Add tombstone/soft-delete sync for transactions, and likely for other synced entities that can be deleted later.

Medium before public release:

- Set updater pubkey or disable updater for v0.1.0 if update infrastructure is not ready.

Low / next minor:

- Add manual chunk splitting if desktop startup or Android startup feels heavy.
- Install a local SQLite inspection tool for repeatable QA SQL checks.
- Install/configure Playwright Chrome or use the Codex in-app browser automation path for repeatable UI QA.

## Open questions

- Will v0.1.0 ship with multi-device sync enabled by default? If yes, C1 and H1 are hard release blockers.
- Is the updater intended to be live in v0.1.0, or should it be disabled until signing keys and update manifests are ready?
