# Session 011 — Android port + sideload (skeleton)

> Prerequisite: Sessions 002-010 complete. Stable desktop app σε production.

> ⚠️ **Skeleton only.** Full prompt at runtime.

---

## Σκοπός

Bring up το ίδιο codebase σε Android. Test, debug platform-specific issues, sign APK, sideload σε Heraklis's device.

---

## Pre-session — δουλειά Heraklis (~1-2 ώρες αν πρώτη φορά)

1. **Install Android Studio** + Android SDK + NDK
2. **Set environment variables**:
   ```powershell
   # Windows
   $env:ANDROID_HOME = "C:\Users\herax\AppData\Local\Android\Sdk"
   $env:NDK_HOME = "$env:ANDROID_HOME\ndk\<version>"
   ```
3. **Add Android target σε Rust**:
   ```bash
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```
4. **Generate Android keystore** (first time only):
   ```bash
   keytool -genkeypair -v -keystore evochia-release.jks -alias evochia -keyalg RSA -keysize 2048 -validity 10000
   ```
   **CRITICAL**: backup το keystore + password σε 1Password/Bitwarden. Αν χαθεί, δεν μπορούμε να publish updates στο ίδιο app id.
5. **Connect Android device** με USB debugging ON, ή start emulator

---

## Scope

1. **Tauri Android init**
   ```bash
   pnpm tauri android init
   ```
   Δημιουργεί `src-tauri/gen/android/` με Gradle project.

2. **Configure signing**
   - Edit `src-tauri/gen/android/app/build.gradle.kts` με signing config
   - Reference keystore via env var (NEVER commit path)

3. **Test in emulator/device**
   ```bash
   pnpm tauri android dev
   ```
   - First boot: συνήθως slow (Gradle download)
   - Test core flows σε real device:
     - Sign in with magic link (email opens browser → callback to app via deep link?)
     - Add transaction
     - Sync push/pull
     - Camera για receipt photo (αν Session 007 done)

4. **Platform-specific issues** (αναμένονται)
   - Magic link callback: deep link configuration σε `AndroidManifest.xml`
   - Camera permission requests
   - File picker για export (αν διαφορετικό από desktop)
   - Native back button behavior
   - Screen sizes / orientation

5. **UI adjustments**
   - Test 414px landscape, 360px portrait, foldables
   - FAB position with software navigation bar
   - Status bar styling
   - Greek font rendering σε Android system webview

6. **Build signed APK**
   ```bash
   pnpm tauri android build
   ```
   Output: `src-tauri/gen/android/app/build/outputs/apk/release/*.apk`

7. **Sideload σε Heraklis device**
   - Settings → Security → Install unknown apps → Allow
   - Transfer APK (USB / Drive / email)
   - Tap to install
   - First-time: confirm permissions
   - Sign in με ίδιο email → δεδομένα συγχρονίζονται από Supabase

---

## Key decisions στο runtime

- **Magic link callback strategy**: deep link με app:// URI ή HTTP redirect σε finance.evochia.gr με Universal Links;
- **APK distribution**: Google Drive private link, ή hosted στο finance.evochia.gr/android;
- **Update mechanism**: αυτόματο σε Android είναι τρικ — Tauri updater works αλλά Android security requires user approval κάθε φορά. Decision: notification + manual update;

---

## Risks

| Risk | Mitigation |
|---|---|
| Lost Android keystore | Backup σε password manager **πριν first build** |
| Tauri 2 Android maturity | Test core flows early. Αν critical bugs, fallback PWA wrapper για mobile |
| WebView differences | Test σε real Android (όχι emulator μόνο) |
| Camera plugin Android-only quirks | Session 007 ΑΝ έγινε με fallback file picker, αυτό είναι OK |

---

## Expected effort: ~4-8 ώρες (πιθανότατα σπάει σε χωριστό 011a init + 011b polish)

---

## Manual test checklist

- [ ] APK installs επιτυχώς σε Heraklis's Android
- [ ] App launches χωρίς crash
- [ ] Magic link sign-in works (email click → callback to app)
- [ ] Καταχώρηση transaction → εμφανίζεται στο Dashboard
- [ ] Sync push σε Supabase
- [ ] Καταχώρηση σε desktop, sync, εμφανίζεται σε Android
- [ ] Receipt photo capture (αν 007 done)
- [ ] App περνάει σε background, επανέρχεται με preserved state
- [ ] Greek text renders σωστά
- [ ] Touch targets accessible (FAB, list rows, form inputs)
- [ ] Performance: list scrolls smoothly με 200+ transactions

---

## Post-session

Όταν δουλεύει σε Android:
1. **Update CLAUDE.md** — Status snapshot με Android working
2. **Update ROADMAP.md** — όλα τα sessions ✅
3. **Tag release v1.0.0** στο GitHub
4. **Heraklis switches to production use** — αρχίζει real data entry

---

## Phase 5+ (μελλοντικά, εκτός scope)

- iOS port (αν προκύψει ανάγκη)
- myDATA integration
- Multi-currency
- Budget tracking
- AI categorization

---

*Full prompt at runtime. Tauri Android documentation + community guides προσπερνάνε γρήγορα — refer στα docs τότε.*
