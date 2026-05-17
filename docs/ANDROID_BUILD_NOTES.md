# Android build notes

Updated: 2026-05-15

## Current status

- Android Studio installed.
- Android SDK command-line tools installed under `C:\Users\herax\AppData\Local\Android\Sdk\cmdline-tools\latest`.
- SDK packages installed: platform-tools, Android API 35/36, build-tools 35/36, NDK `27.3.13750724`.
- Rust Android targets installed: `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`.
- `corepack pnpm tauri android init` generated `src-tauri/gen/android/`.
- Arm64 debug APK built successfully for v0.2.5:
  `src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`
- APK metadata verified with `aapt`: package `app.rheo.finance`, `versionName=0.2.5`,
  `versionCode=2005`, `minSdk=24`, `targetSdk=36`, native code `arm64-v8a`.
- Stronghold and updater are desktop-only in Rust. Android currently uses the existing
  frontend `localStorage` fallback for Supabase auth/updater token storage.

`src-tauri/gen/` is ignored by git, so the generated Gradle project and APK are local build artifacts. After changing the package identifier, delete `src-tauri/gen/android` and run `tauri android init` again so the generated Java package tree matches `app.rheo.finance`.

## Environment

The following user-level environment variables were set:

```powershell
ANDROID_HOME=C:\Users\herax\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\herax\AppData\Local\Android\Sdk
NDK_HOME=C:\Users\herax\AppData\Local\Android\Sdk\ndk\27.3.13750724
```

For the current terminal session:

```powershell
$env:ANDROID_HOME = "C:\Users\herax\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\27.3.13750724"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"
$env:CARGO_BUILD_JOBS = "1"
```

## Build

Normal command:

```powershell
corepack pnpm tauri android build --debug
```

On this Windows machine the Rust library compiled, but Tauri failed when creating the Android `jniLibs` symlink. Proper fix: enable Windows Developer Mode or run a shell with symlink privilege.

Temporary workaround used after the Rust `.so` was built:

```powershell
$src = "src-tauri\target\aarch64-linux-android\debug\librheo_finance_lib.so"
$destDir = "src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item -LiteralPath $src -Destination (Join-Path $destDir "librheo_finance_lib.so") -Force

Set-Location "src-tauri\gen\android"
.\gradlew.bat :app:assembleArm64Debug -x :app:rustBuildArm64Debug
```

The APK output is:

```text
src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```

Current v0.2.5 debug build used that workaround successfully.

## Sideload

Latest wireless ADB smoke used device `CPH2609` with package `app.rheo.finance`.

When the device is connected with USB debugging enabled:

```powershell
$apk = "src-tauri\gen\android\app\build\outputs\apk\arm64\debug\app-arm64-debug.apk"
adb install -r $apk
```

## Release signing

Release APK signing is intentionally not configured yet because it needs a private keystore and password storage decision.

Create the keystore once, then back it up in a password manager:

```powershell
keytool -genkeypair -v -keystore rheo-release.jks -alias rheo -keyalg RSA -keysize 2048 -validity 10000
```

Do not commit the keystore or passwords. Suggested environment variables:

```text
EVOCHIA_ANDROID_KEYSTORE
EVOCHIA_ANDROID_KEY_ALIAS
EVOCHIA_ANDROID_KEYSTORE_PASSWORD
EVOCHIA_ANDROID_KEY_PASSWORD
```

## Manual QA checklist

- APK installs on Heraklis's Android device.
- App launches without crash.
- Email/password login works.
- Add transaction, verify it appears on Dashboard.
- Sync push to Supabase.
- Add transaction on desktop, sync, verify it appears on Android.
- Receipt photo flow works if the device grants file/photo permissions.
- Background/resume preserves state.
- Greek text and touch targets render correctly on real device.

Reference: official Android Studio and command-line tools page: https://developer.android.com/studio
