# Changelog

All notable changes to Rheo Finance will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning while it is in active pre-1.0 development.

## Unreleased

### Added

- Full update channel infrastructure through GitHub Releases.
- Desktop update banner with one-click signed update install.
- Android update manifest and assisted update banner.
- CI release workflow that builds Windows, Android, and updater manifests from version tags.

## v0.2.5 - 2026-05-17

Rheo Finance rebrand and release-channel baseline.

### Added

- Windows signed installer through GitHub Releases.
- Android sideload APK artifact.
- Private GitHub updater token support for the current private repo.
- Rheo app identifier/package: `app.rheo.finance`.
- Rheo production launcher icons.

### Changed

- Product naming and repo links moved to Rheo Finance.
- GitHub release assets now include updater manifest compatibility for installed clients.

### Fixed

- Android launcher icon resources now use the Rheo production icon.
- Release workflow tolerates Tauri updater artifact naming differences.
