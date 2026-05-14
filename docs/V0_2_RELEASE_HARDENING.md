# v0.2.0 Release Hardening

## Done in code

- Supabase auth persistence uses Tauri Stronghold on desktop instead of browser localStorage.
- Existing Supabase localStorage auth tokens are migrated into Stronghold on first read.
- Stronghold uses the native plugin with Argon2 key derivation and an app-local salt file.
- Tauri updater plugin is registered on desktop builds and exposed from Settings.
- Tauri updater public key, endpoint, and artifact generation are configured for v0.2.0.
- Private GitHub updater checks can use a user-provided token stored locally in Stronghold.
- Transaction amount filters now show validation errors instead of silently ignoring malformed amounts.
- SQLite foreign key enforcement is enabled and verified when the local DB connection opens.

## Updater signing material

The updater signing key was generated locally on Heraklis's Windows profile and rotated on
2026-05-14 before the first public/private release upload.

- Private key: `%USERPROFILE%\.tauri\evochia-finance.key`
- Public key: `%USERPROFILE%\.tauri\evochia-finance.key.pub`
- Password: `%USERPROFILE%\.tauri\evochia-finance.key.password.dpapi`

The password file is DPAPI-encrypted for the current Windows user. Keep the private key,
public key, and password backup outside git. If the private key or password is lost,
existing users cannot receive future signed updater packages from this key.

Important: discard any installer/signature artifacts created before the 2026-05-14 key
rotation. Rebuild v0.2.0 after the rotation and upload only artifacts signed with the
current public key in `src-tauri/tauri.conf.json`.

For GitHub Actions releases, add these repository secrets:

```text
TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

`GITHUB_TOKEN` is provided automatically by GitHub Actions. The workflow at
`.github/workflows/release.yml` builds Windows, uploads the installer/signature,
and lets `tauri-apps/tauri-action` generate `latest.json` for the updater.

## Release build

Set signing environment variables from the local key and DPAPI password file before running `tauri build`.

```powershell
$keyPath = Join-Path $env:USERPROFILE ".tauri\evochia-finance.key"
$passPath = Join-Path $env:USERPROFILE ".tauri\evochia-finance.key.password.dpapi"
$secure = Get-Content -LiteralPath $passPath | ConvertTo-SecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -LiteralPath $keyPath -Raw
  $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  corepack pnpm tauri build
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD -ErrorAction SilentlyContinue
}
```

Expected signed artifacts after rebuilding:

```text
src-tauri/target/release/bundle/nsis/Evochia Finance_0.2.0_x64-setup.exe
src-tauri/target/release/bundle/nsis/Evochia Finance_0.2.0_x64-setup.exe.sig
```

Upload the generated installer, its `.sig`, and `latest.json` to GitHub Releases.
The app checks the latest release asset at:

```text
https://github.com/heraklist/evochia_finance/releases/latest/download/latest.json
```

The repository currently stays private. In the installed app, go to Settings -> About ->
Private GitHub updater and paste a GitHub token with read access to
`heraklist/evochia_finance`. The token is stored only in the desktop runtime through
Stronghold and is sent as an `Authorization: Bearer ...` header during updater checks.

Do not bake this token into the binary, commit it to git, or put it in `tauri.conf.json`.
If GitHub rejects authenticated access through the static release download endpoint, the
fallback is a public release-only repository or a small authenticated feed endpoint.

With static GitHub `latest.json`, Tauri performs the version comparison client-side.
The release workflow should generate the final `latest.json`; do not reuse older samples
from before the signing-key rotation.
