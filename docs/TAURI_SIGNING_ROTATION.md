# Tauri updater signing rotation

This app currently has a new updater public key in `src-tauri/tauri.conf.json`.
The matching private key and password are stored only in the local `_secrets`
backup outside the repository.

## Do not do yet

Do not replace the GitHub Actions `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets until a transitional desktop
release has shipped.

Existing installed desktop apps trust the old public key embedded in their
current build. They can only install an update that is signed with the old
private key.

## Correct rotation order

1. Keep the existing GitHub Actions `TAURI_SIGNING_*` secrets unchanged.
2. Ship one transitional release with the new public key embedded in
   `tauri.conf.json`, signed by the old GitHub Actions private key.
3. Install or auto-update current desktop clients to that transitional version.
4. Replace the GitHub Actions `TAURI_SIGNING_PRIVATE_KEY` and
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets with the new local rotation
   key/password from `_secrets`.
5. Ship all later releases signed with the new key.

## Local-only files

The local backup files are intentionally outside the git repository:

- `_secrets/tauri-signing-rotation/rheo-updater-rotation.key`
- `_secrets/tauri-signing-rotation/rheo-updater-rotation.key.pub`
- `_secrets/tauri-signing-rotation/rheo-updater-rotation.password.txt`
- `_secrets/tauri-signing-rotation/github-actions-tauri-signing-rotation.env`

Store these in the password manager before rotating GitHub Actions secrets.
