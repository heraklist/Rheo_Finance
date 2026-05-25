# Changelog

All notable changes to Rheo Finance will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning while it is in active pre-1.0 development.

## v0.2.18 - 2026-05-25

### Fixed

- Windows login session storage now tries app-level secure storage commands before plugin command prefixes, avoiding false login failures after Supabase accepts credentials.
- Native secure auth storage command invocation is tolerant to both underscore and hyphenated Tauri plugin command IDs.

## v0.2.17 - 2026-05-25

### Added

- Landing confirmation page for Supabase email verification redirects.

### Fixed

- Signup now sends Supabase email verification links to the Rheo landing confirmation page explicitly.

## v0.2.16 - 2026-05-25

### Added

- Landing/Vercel subscription endpoints for Pro checkout, subscription status, and customer portal.

### Changed

- Release builds now embed the public landing URL and the new Supabase publishable project config.

### Fixed

- Billing APIs now require the signed-in user's Supabase access token instead of trusting client-provided user/customer IDs.
- Tauri CSP now allows the Rheo landing domain for subscription and checkout API calls.

## v0.2.15 - 2026-05-25

### Fixed

- Release workflow now stages only installer/APK artifacts before publish, so web build files are not uploaded as release assets.

## v0.2.14 - 2026-05-25

### Changed

- Fresh Supabase setup docs now include the complete Rheo migration order for a rebuilt SaaS project.
- Root Biome lint ignores the separate `landing/` project so app lint stays scoped to Rheo Finance.

### Fixed

- Supabase schema now enforces tenant-consistent child rows with composite `(user_id, id)` foreign keys.
- Signup and Settings/About copy no longer contains broken encoded Greek text.

## v0.2.9 - 2026-05-20

### Changed

- Database initialization now reuses a single in-flight connection promise.
- Transaction writes and outbox entries are now committed atomically.
- Sync now stores server `updated_at` values after successful Supabase writes.
- Desktop update links now open through Tauri shell instead of navigating the WebView.

### Fixed

- Backup restore validates foreign keys before commit.
- Recurring daily generation now has an in-process concurrency guard.
- Login, auth initialization, MFA settings, and transaction form async flows no longer leave stale loading or stale response state.
- VAT split now keeps `net + vat` aligned with rounded gross totals.
- Release workflow version extraction validates tag format before using it.

## v0.2.8 - 2026-05-18

### Changed

- Desktop update checks now read private GitHub Releases through the GitHub API when an updater token is saved.
- Desktop update action now opens the GitHub release for manual installer download while the repo remains private.

### Fixed

- Settings update check no longer fails on private GitHub release download URLs that return 404 outside the GitHub API.

## v0.2.7 - 2026-05-18

### Changed

- Settings About copy now describes the GitHub Releases update flow for desktop and Android.
- About version now comes from the app package version to avoid stale labels.

### Fixed

- Android launcher icon no longer exposes a monochrome themed-icon layer that could render as a white mark without the Rheo background.

## v0.2.6 - 2026-05-18

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
