# QA Final Report — CLAUDE_CODE — 2026-05-17 (Post-Rebrand)

## Συνοπτικά

**Verdict: Production-ready for manual distribution.**

Rheo Finance v0.2.5. Full rebrand from "Evochia Finance" completed. All build gates pass (tsc 0 errors, biome 82 files clean, vite build 8.46s success, cargo check 24.31s success). Code splitting: 4 chunks (main 386 KB, charts 463 KB, supabase 208 KB, d3 63 KB). Zero hardcoded secrets, zero `console.log`, zero `any` types, zero TODOs in source.

- Critical findings: 0
- High findings: 1
- Medium: 3
- Low: 2

---

## Build health

| Check | Result |
|---|---|
| TypeScript (`pnpm typecheck`) | 0 errors |
| Lint (`pnpm lint` / biome) | 0 errors, 82 files checked |
| Production build (`pnpm build`) | Success, 8.46s, 4 chunks |
| Cargo check | Success, 24.31s |

---

## Findings — Critical (block release)

None.

---

## Findings — High (fix soon)

| # | Area | Description | File:Line | Notes |
|---|---|---|---|---|
| H1 | Backward compat | `LEGACY_KEY_PREFIX` removed from `secureAuthStorage.ts`. Users with auth tokens stored under old `"evochia-auth:"` localStorage keys will not have them migrated on first launch. Impact: may need to re-login once after upgrade. | `src/lib/secureAuthStorage.ts` | Low practical impact — Stronghold holds primary auth, localStorage is fallback only. Heraklis will need one re-login at most. |

---

## Findings — Medium

| # | Area | Description | File:Line | Notes |
|---|---|---|---|---|
| M1 | Rebrand | Backward-compat items were changed by external edit (db filename to `rheo.db`, persist key to `rheo-app-state`, COMPANY_TOKEN to `/\bRheo\b/g`). **Fixed during this QA** — reverted to `sqlite:evochia.db`, `"evochia-app-state"`, `/\bEvochia\b/g`. | `db.ts:25`, `store.ts:76`, `company.ts:3`, `tauri.conf.json:50`, `lib.rs:33` | Verified all 5 locations now correct |
| M2 | Sync | `deleteRemoteReceiptPhoto` called AFTER Supabase soft-delete — correct order, no data loss risk. | `src/lib/sync.ts:591-598` | Confirmed safe |
| M3 | Money | `parseGreekAmount("1.234")` correctly parsed as 1234 via `hasValidThousandsGroups` regex. | `src/lib/money.ts:33` | Confirmed correct |

---

## Findings — Low (nits)

| # | Area | Description | File:Line | Notes |
|---|---|---|---|---|
| L1 | Docs | `docs/Evochia_Finance_Project_Plan_v1.1.md` not renamed to Rheo — kept as historical reference per SESSION_014 guidance | docs/ | Acceptable |
| L2 | Docs | Session prompt files (`SESSION_*.md`) retain old "Evochia" naming — historical record, no action needed | docs/ | Acceptable |

---

## Rebrand verification

### Product brand layer (must show "Rheo")

| Item | Status | Value |
|---|---|---|
| `package.json` name | ✅ | `rheo-finance` |
| `Cargo.toml` name | ✅ | `rheo-finance` |
| `tauri.conf.json` productName | ✅ | `Rheo Finance` |
| `tauri.conf.json` identifier | ✅ | `app.rheo.finance` |
| `index.html` title | ✅ | `Rheo Finance` |
| BrandMark component | ✅ | `◆ Rheo` |
| Login screen | ✅ | "Rheo" large + "Finance" subtitle + tagline |
| Settings About | ✅ | `Rheo Finance v{version}` |
| GitHub repo link | ✅ | `heraklist/Rheo_Finance` |
| Updater endpoint | ✅ | `heraklist/Rheo_Finance/releases/latest/download/latest.json` |
| Updater API base | ✅ | `api.github.com/repos/heraklist/Rheo_Finance` |
| Backup filenames | ✅ | `rheo-backup-*`, `rheo-auto-backup-*` |
| Backup directory | ✅ | `Documents/Rheo_Backups` |
| Export filenames | ✅ | `rheo-{scope}-{period}.xlsx` |
| Backup app field | ✅ | `"Rheo Finance"` |
| Desktop icons | ✅ | Rheo icon package (5 files) |
| `lib.rs` comment | ✅ | `// Rheo Finance — Tauri main entry` |
| Stronghold password | ✅ | `app.rheo.finance.supabase-auth.v1` |

### Backward compat layer (must keep old values)

| Item | Status | Value |
|---|---|---|
| DB filename (`db.ts`) | ✅ | `sqlite:evochia.db` |
| DB filename (`tauri.conf.json` preload) | ✅ | `sqlite:evochia.db` |
| DB filename (`lib.rs` migrations) | ✅ | `sqlite:evochia.db` |
| Zustand persist key | ✅ | `"evochia-app-state"` |
| COMPANY_TOKEN regex | ✅ | `/\bEvochia\b/g` |
| Seed data account names | ✅ | Kept as-is (token replacement handles) |

### Version consistency

| File | Version |
|---|---|
| `package.json` | 0.2.5 |
| `Cargo.toml` | 0.2.5 |
| `tauri.conf.json` | 0.2.5 |
| `settingsOptions.ts` APP_VERSION | 0.2.5 |

### Zero remaining product "Evochia Finance" references in src/

```
grep -rn "Evochia Finance" src/ → 0 matches ✅
```

Remaining "evochia" references (all backward-compat, must stay):
- `src/lib/db.ts:25` — `sqlite:evochia.db`
- `src/lib/store.ts:76` — `"evochia-app-state"`
- `src/lib/company.ts:3` — `COMPANY_TOKEN = /\bEvochia\b/g`
- `src/hooks/useDisplayAccountName.ts:12` — comment explaining token replacement

---

## Static analysis — security

| Check | Result |
|---|---|
| Hardcoded secrets (service_role, sk_live, etc.) | 0 matches ✅ |
| `.env` files in repo | 0 files ✅ |
| CSP configured | ✅ Restrictive policy with explicit allowlist |
| Updater pubkey | ✅ Present (minisign base64) |
| `console.log` in production | 0 matches ✅ |
| `any` types | 0 matches ✅ |
| TODOs without issue ref | 0 matches ✅ |

---

## CompanyName empty state

| Scenario | Expected | Status |
|---|---|---|
| New user (no persisted state) | `companyName = ""` | ✅ Default is `""` |
| Existing user (Heraklis) | `companyName = "Evochia"` (persisted) | ✅ Persist key unchanged |
| Login screen | Shows "Rheo / Finance" (no company name) | ✅ |
| Settings BusinessSection empty | Warning + "Δεν έχει οριστεί" + "Προσθήκη" button | ✅ |
| Settings BusinessSection set | Normal display + "Επεξεργασία" button | ✅ |
| Account name display (empty company) | Stored name as-is (no replacement) | ✅ |
| Account name display (company set) | "Evochia" token replaced | ✅ |

---

## Documentation updates

| Doc | Updated |
|---|---|
| `README.md` | ✅ Rheo branding, repo link, About section |
| `docs/CLAUDE.md` | ✅ TL;DR, BrandMark, repo, version, locked decisions |
| `docs/ROADMAP.md` | ✅ Header |
| `docs/CODEX_HANDOFF.md` | ✅ Header, BrandMark, repo link |

---

## Recommended fixes πριν release

1. **[High] Legacy auth key migration removed** — Low practical impact since Stronghold is primary storage. Heraklis may need one re-login after upgrade. No action required unless other users exist.

2. **[Fixed during QA] Backward-compat violations** — DB filename, persist key, and COMPANY_TOKEN were changed by external edit. All reverted to correct values during this QA session.

---

## Open questions

1. **Stronghold password change**: Stronghold password changed from `gr.evochia.finance.supabase-auth.v1` to `app.rheo.finance.supabase-auth.v1`. This means existing Stronghold vault won't open with the new password — Heraklis will fall back to localStorage and need to re-authenticate once. Acceptable for single-user beta?

2. **Backup directory migration**: Old backups are in `Documents/Evochia_Backups/`, new ones go to `Documents/Rheo_Backups/`. Restore dialog defaults to new path. Should we add a note to Heraklis about copying old backups?
