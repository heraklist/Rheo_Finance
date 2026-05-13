# v0.2.0 Release Hardening

## Done in code

- Supabase auth persistence uses Tauri Stronghold on desktop instead of browser localStorage.
- Existing Supabase localStorage auth tokens are migrated into Stronghold on first read.
- Stronghold uses the native plugin with Argon2 key derivation and an app-local salt file.
- Tauri updater plugin is registered on desktop builds and exposed from Settings.
- SQLite foreign key enforcement is enabled and verified when the local DB connection opens.

## Updater signing gate

The updater is wired, but release updates must not be published until the signing key exists.

Generate the updater signing key once:

```powershell
corepack pnpm tauri signer generate -w "$env:USERPROFILE\.tauri\evochia-finance.key"
```

Keep the private key and password out of git. Store a secure backup.

Before the final signed v0.2.0 release:

1. Paste the generated public key into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
2. Add the production update endpoint under `plugins.updater.endpoints`.
3. Set `bundle.createUpdaterArtifacts` to `true`.
4. Build with `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` set in the shell.
5. Upload the generated installer, updater artifact, signature, and update manifest to the configured endpoint.

Do not use a placeholder public key. A wrong key makes update checks look configured while every install fails signature verification.
