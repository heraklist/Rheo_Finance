# Session 010 — Settings + Excel export + production polish (skeleton)

> Prerequisite: Sessions 007-009 done. Most features working.

> ⚠️ **Skeleton only.** Full prompt at runtime.

---

## Σκοπός

Ολοκλήρωση Settings page + Excel export για λογιστή + όλα τα pre-production cleanups πριν first signed release.

---

## Part A: Full Settings page

### Sections
1. **Λογαριασμός**
   - Email display + sign out (ήδη υπάρχει από S005)
   - **Νέο:** Delete account (με double confirmation, calls Supabase RPC)

2. **Συγχρονισμός** (ήδη υπάρχει από S006)
   - Status, last synced, manual sync
   - **Νέο:** Reset sync state (clear last_synced_at, force full re-pull)

3. **Backup**
   - Manual SQLite export → save σε `~/Documents/Evochia_Backups/`
   - Restore from file
   - **Auto-backup**: weekly (toggle on/off)

4. **Export** (Part B below)

5. **Προτιμήσεις**
   - Default VAT rate (24% / 13% / 6%)
   - Default book (Επαγγελματικά / Προσωπικά)
   - Default payment method
   - Currency (EUR — placeholder για future)

6. **Σχετικά**
   - App version
   - Check for updates button
   - Open project repo
   - License (MIT or proprietary — Heraklis decides)

---

## Part B: Excel export

### Σκοπός
Με ένα tap, .xlsx για τον λογιστή με όλα τα data της περιόδου.

### Implementation
- **Library**: SheetJS (`xlsx`) — αλλά είναι 1MB+ bundle. Alternative: `exceljs` πιο βαρύ. Decision at runtime.
- **3 sheets** σε ένα workbook:
  1. **Transactions** — flat list με όλα τα fields της περιόδου
  2. **VAT Summary** — quarterly aggregations
  3. **Categories Breakdown** — pivot ανά category x month

### Flow
1. Settings → Export
2. Period selector (Q1/Q2/Q3/Q4 του τρέχοντος έτους + custom range)
3. Book selector (Επαγγελματικά / Προσωπικά / Both)
4. Format: Excel (αργότερα: CSV, JSON)
5. Tap "Δημιουργία" → generate → native save dialog (Tauri plugin-dialog) → save στο Downloads/

### Key implementation
- Build workbook in-memory με SheetJS
- Convert to Blob
- Native save dialog: `await save({ defaultPath: 'evochia-2026-Q1.xlsx', filters: [...] })`
- Write file: `await writeBinaryFile(...)`

---

## Part C: Production polish

### Security
1. **Enable CSP** σε `tauri.conf.json`:
   ```json
   "csp": "default-src 'self'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co"
   ```
   Test: app loads ακόμα; (το CSP σπάει εύκολα)

2. **Updater pubkey**:
   ```bash
   pnpm tauri signer generate -w ~/.tauri/evochia-finance.key
   ```
   Save private key SECURELY. Public key στο `tauri.conf.json` `pubkey` field.

3. **Code signing** (Windows): self-signed για τώρα ή proper cert ($300/yr). Decision: skip κανονικό cert στο Phase 4.

### Performance
- Lazy-load routes με React.lazy + Suspense
- Reduce bundle size — analyze με `vite build --mode analyze`
- Index usage: confirm SQLite indexes είναι useful (EXPLAIN QUERY PLAN spot checks)

### CI/CD
- GitHub Action για:
  - Lint + typecheck σε PR
  - Build desktop installer σε release tag
  - Upload artifacts σε GitHub Releases

### Auto-updater wire-up
- Generate update.json manifest για κάθε release
- Host σε `finance.evochia.gr/update/{target}/{version}` (Vercel)
- App checks daily, downloads + installs on next launch

### First production build
```bash
pnpm tauri build --target x86_64-pc-windows-msvc
```
Test installer σε καθαρό Windows VM.

---

## Expected effort: ~6-8 ώρες (πιθανώς σπάει σε 010a Settings/Export + 010b Polish/CI)

---

## Manual test checklist

- [ ] Settings sections όλες λειτουργικές
- [ ] Default VAT preference: άλλαξε σε 13% → νέα transaction defaults σε 13%
- [ ] Backup manual: δημιουργία .db file → restore σε καθαρό state → όλα τα data εμφανίζονται
- [ ] Excel export Q1: άνοιξε σε Excel → 3 sheets, σωστά totals, valid VAT
- [ ] CSP enabled, app boots χωρίς console errors
- [ ] Updater check (mocked): δείχνει "no updates" όταν latest
- [ ] Production build: installer τρέχει σε Win11 VM, app launches, sign-in works

---

*Full prompt at runtime. Έντονη χρήση native Tauri APIs (dialog, fs, updater).*
