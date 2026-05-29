# Changelog

All notable changes to Rheo Finance will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning while it is in active pre-1.0 development.

## v0.2.26 - 2026-05-29

### Fixed

- Settings update checks now trigger the existing desktop install flow when a Tauri update is available.
- Vercel landing production deployment now builds from the `landing` project root so updater download manifests are available again.

### Changed

- Expanded dependency governance to include Cargo/Rust and GitHub Actions Dependabot updates.
- Pinned pnpm through `packageManager` metadata for root and landing packages.

## v0.2.24 - 2026-05-27

### Fixed

- Desktop and Android update checks now use the Rheo landing Vercel download proxy instead of direct GitHub Release asset URLs.
- The Vercel update proxy keeps GitHub credentials server-side while returning Tauri-compatible manifests and signed release download URLs to the app.
- Update downloads are pinned to the manifest version to avoid downloading a newer asset with an older signature.

### Changed

- Updated safe patch/minor dependencies for Supabase, React Query, React Hook Form, and date-fns.

## v0.2.23 - 2026-05-26

### Fixed

- Sync now adopts existing Supabase reference data on a fresh local install instead of re-pushing seed books with new local IDs.
- Prevents duplicate `(user_id, slug)` conflicts when the same account signs in on a new desktop or Android install.

## v0.2.22 - 2026-05-25

### Added

- Manual entitlement grants for owner/tester/manual access through a server-only Vercel admin endpoint.
- Subscription metadata now records entitlement source, grant reason, and optional expiry.
- Documentation for Phase 1 entitlement behavior and tester/owner grants.

## v0.2.21 - 2026-05-25

### Changed

- Settings/About now hides technical updater distribution details from end users.
- Settings/About now shows the current subscription plan instead of the old private-use license text.
- Subscription tier types and Supabase constraints now support `free`, `solo`, `pro`, and `team`.

## v0.2.20 - 2026-05-25

### Changed

- Desktop updater now uses the public signed GitHub Releases feed directly, without a GitHub token.
- Settings/About update copy now reflects public releases, automatic desktop install, and signed Android arm64 sideload updates.
- Landing download API can resolve public GitHub release assets without requiring `GITHUB_PAT`, while still using it when present.

## v0.2.19 - 2026-05-25

### Changed

- Android release workflow now builds a signed `arm64-v8a` APK as the primary sideload artifact when release signing secrets are present.
- Android fallback debug artifact is also limited to `arm64-v8a` to avoid large universal debug APKs.

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
