# QA Final Report - CODEX - 2026-05-17

## Verdict

**Rheo Finance v0.2.5: build-ready for GitHub manual distribution.**

This run rechecked the rebrand from Evochia to Rheo, kept the app at version
`0.2.5`, and switched the app identifier/package to `app.rheo.finance`.

## Rebrand checks

- Product name: `Rheo Finance`
- Version: `0.2.5`
- Desktop identifier: `app.rheo.finance`
- Android package: `app.rheo.finance`
- Rust package/lib: `rheo-finance` / `rheo_finance_lib`
- Local SQLite database: `sqlite:rheo.db`
- Zustand persisted store: `rheo-app-state`
- Stronghold namespace: `app.rheo.finance.supabase-auth.v1`
- Backup default folder: `Documents/Rheo_Backups`
- Seed business accounts: `Ταμείο Rheo`, `Τράπεζα Rheo`, `Κάρτα Rheo`

The GitHub repo is `heraklist/Rheo_Finance`; updater endpoints use that private repo.

## Build gates

| Check | Result |
|---|---|
| `tsc --noEmit` | Pass |
| `biome check .` | Pass, 82 files |
| `cargo check` | Pass, `rheo-finance v0.2.5` |
| `vite build` | Pass |
| Signed Tauri desktop build | Pass |
| Android arm64 debug APK | Pass via Windows symlink workaround |
| Android device install/smoke | Pass on `CPH2609` via wireless ADB |

## Release artifacts

- `src-tauri/target/release/bundle/nsis/Rheo Finance_0.2.5_x64-setup.exe`
- `src-tauri/target/release/bundle/nsis/Rheo Finance_0.2.5_x64-setup.exe.sig`
- `C:/Users/herax/Desktop/GPT_/Evochia Finance/Android Builds/Rheo-Finance-v0.2.5-android-arm64-debug.apk`

Android metadata verified with `aapt`:

- package: `app.rheo.finance`
- versionName: `0.2.5`
- versionCode: `2005`
- minSdk: `24`
- targetSdk: `36`
- native-code: `arm64-v8a`

## QA findings status

- H1 sync delete photo order: fixed before this run.
- H2 Greek amount `"1.234"` parsing: fixed before this run.
- M1 VAT rounding formula: fixed before this run.
- M2 export VAT rounding: fixed before this run.
- M3 large components: improved; remaining large files are not release blockers.
- M4 charts lazy loading: implemented; chart components are lazy-loaded.
- M5 CLAUDE.md outdated: updated to Rheo v0.2.5 state.
- L2 Stronghold migration fallback: fixed before this run.
- L3 submitting flag reset: fixed before this run.

## Runtime smoke

Wireless ADB pairing/connect completed against `192.168.1.4:42881`.

Installed APK:

- `adb install -r Rheo-Finance-v0.2.5-android-arm64-debug.apk` -> success.
- Old Android package `gr.evochia.finance` removed with `adb uninstall`.
- Package list after cleanup contains `app.rheo.finance` only.
- Explicit launch with `am start -n app.rheo.finance/.MainActivity` succeeded.
- Focus check: `app.rheo.finance/app.rheo.finance.MainActivity`.
- Screenshot confirmed rendered Rheo UI and no white screen.

## Release decision

Proceed with GitHub release refresh for `v0.2.5`, replacing old Evochia-named
assets with Rheo-named assets. After upload, smoke test the desktop updater
with the stored private GitHub token.
