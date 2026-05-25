# Android build notes

Updated: 2026-05-21

## Current status

- Android Studio installed.
- Android SDK command-line tools installed under `C:\Users\herax\AppData\Local\Android\Sdk\cmdline-tools\latest`.
- SDK packages installed: platform-tools, Android API 35/36, build-tools 35/36, NDK `27.3.13750724`.
- Rust Android targets installed: `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android`.
- `corepack pnpm tauri android init` generated `src-tauri/gen/android/`.
- Arm64 debug APK previously built successfully for v0.2.5:
  `src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`
- APK metadata verified with `aapt`: package `app.rheo.finance`, `versionName=0.2.5`,
  `versionCode=2005`, `minSdk=24`, `targetSdk=36`, native code `arm64-v8a`.
- Auth token storage uses native secure storage on Windows and Android.
  Stronghold remains desktop legacy-read/migration only.

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

On this Windows machine the Rust Android library compiled, but Tauri failed when creating the Android `jniLibs` symlink with `Creation symbolic link is not allowed for this system`. This is an OS privilege issue, not a repo code issue.

Permanent fixes:

- Enable Windows Developer Mode: Settings -> System -> For developers -> Developer Mode.
- Or run the Android build in CI/Linux, where the symlink step is allowed.
- Or run a Windows shell that has `SeCreateSymbolicLinkPrivilege`.

Temporary workaround used after the Rust `.so` was built:

```powershell
$src = "src-tauri\target\aarch64-linux-android\debug\librheo_finance_lib.so"
$destDir = "src-tauri\gen\android\app\src\main\jniLibs\arm64-v8a"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null
Copy-Item -LiteralPath $src -Destination (Join-Path $destDir "librheo_finance_lib.so") -Force

Set-Location "src-tauri\gen\android"
.\gradlew.bat :app:assembleArm64Debug -x :app:rustBuildArm64Debug
```

If `src-tauri/gen/android` is regenerated, refresh launcher icons before the
Gradle assemble step:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\refresh-android-icons.ps1
```

This replaces the generated Android launcher/adaptive icon resources from the
tracked source layers in `src-tauri/icons/android/`.

The APK output is:

```text
src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```

Current local v0.2.12 full Android build is blocked only by the Windows symlink privilege after Rust compilation.

## Sideload

Latest wireless ADB smoke used device `CPH2609` with package `app.rheo.finance`.

When the device is connected with USB debugging enabled:

```powershell
$apk = "src-tauri\gen\android\app\build\outputs\apk\arm64\debug\app-arm64-debug.apk"
adb install -r $apk
```

## Release signing

Release APK signing is configured in GitHub Actions through repository secrets. Keep the private keystore backed up outside git.

Create the keystore once, then back it up in a password manager:

```powershell
keytool -genkeypair -v -keystore rheo-release.jks -alias rheo -keyalg RSA -keysize 2048 -validity 10000
```

Do not commit the keystore or passwords. Suggested environment variables:

```text
RHEO_ANDROID_KEYSTORE
RHEO_ANDROID_KEY_ALIAS
RHEO_ANDROID_KEYSTORE_PASSWORD
RHEO_ANDROID_KEY_PASSWORD
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
