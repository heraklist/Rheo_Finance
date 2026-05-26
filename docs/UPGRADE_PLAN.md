# Rheo Finance - Upgrade Plan

Status: 2026-05-26
Current app version: v0.2.22
Scope: Phase A closed, SaaS/Supabase baseline active, next work starts from Phase B.

## Current Platform State

| Area | Status | Notes |
| --- | --- | --- |
| Desktop app | Active | Tauri 2, signed Windows installer, public updater manifest from GitHub Releases. |
| Android app | Active | arm64 APK release path is configured. Signed release APK is used when Android signing secrets exist; debug fallback remains for incomplete signing secrets. |
| Landing | Active | Deployed at `https://landing-two-dun-95.vercel.app/`; downloads are pulled from GitHub Releases. |
| Supabase | Active | New project `jdwetppniotobfsueyzq`; old Supabase project was discarded. Auth, RLS, subscriptions, admin audit log and sync tables are set for SaaS usage. |
| Vercel APIs | Active | Admin grant endpoint/page exists for manual plan grants/tester access. Service role key must stay server-side only. |
| GitHub Releases | Active | Public release feed; user-facing GitHub token field was removed from Settings. |
| Stripe | Pending | Stripe secrets, price IDs and webhook are not created yet. Manual grants cover owner/tester access until billing is wired. |

## Phase A - Completed

Phase A is complete in the current working tree.

### A1. Review Queue

Implemented:
- `src/pages/ReviewQueue.tsx`
- `src/lib/review.ts`
- Route `/review` in `src/App.tsx`
- Navigation entry in `src/components/layout/AppLayout.tsx`

What it covers:
- Uncategorized transactions
- Missing receipts
- Possible duplicates
- Overdue coverage items
- Sync issue candidates
- OCR placeholder group for future work

### A2. Quick Add Drawer

Implemented:
- `src/components/layout/QuickAddDrawer.tsx`
- Drawer/FAB integration in `src/components/layout/AppLayout.tsx`

What it covers:
- Fast transaction entry
- Recurring shortcut
- Plan builder shortcut
- Export/settings shortcut

### A3. Plan Builder v2

Implemented in:
- `src/pages/PlanBuilder.tsx`

What it covers:
- What-if controls
- Decision summary
- Commitment/available-after-commitments logic
- Scenario metrics
- Positive-only amount validation for plan income/expense items

### A4. Subscription and Plan Display

Implemented in:
- `src/components/settings/SubscriptionSection.tsx`

What it covers:
- Current plan display
- Usage/limits view
- Plan comparison/upgrade surface
- Owner/tester grants through server-side subscription rows

User-facing updater explanation was removed from Settings because it is operational detail and not useful to the user.

### A5. SaaS Entitlements and Admin Grants

Implemented:
- Supabase `subscriptions` table and RLS policies
- Vercel admin grant flow for owner/testers
- Live hardening migration `20260526131804_restrict_subscription_grants.sql`
- Live admin-audit and advisor cleanup migrations through `20260526180757_admin_audit_explicit_deny_policy.sql`

Current grant model:
- App users can read their own subscription row.
- App users cannot directly insert/update/delete `subscriptions`.
- Server-side Vercel APIs use the service role key to grant or change plans.
- Manual grants cover `free`, `solo`, `pro`, `team`, owner/full access and testers until Stripe is added.

### A6. Sync/Import Stabilization

Fixed:
- Removed `categories.user_id` from local sync columns because local SQLite `categories` has no `user_id`.
- Confirmed local sync schema mapping has no mismatches against the current SQLite database.
- Supabase RLS and authenticated Data API grants are present for the new SaaS project.

## Phase A Verification

Passed locally:
- `pnpm.cmd typecheck`
- `pnpm.cmd lint`
- `pnpm.cmd build`
- `pnpm.cmd audit --audit-level high`
- `git diff --check`
- `cargo check --manifest-path src-tauri\Cargo.toml`
- Fresh SQLite migration harness: all local migrations apply, no FK violations, no sync schema mismatches
- Supabase live checks for RLS policies and subscription grants
- Supabase live security/performance advisors: no unindexed-FK findings remain; only intentional/dashboard-level warnings remain
- Playwright browser smoke for `/login` and `/signup`
- GitHub Actions live check for release `v0.2.22`: Windows, Android and publish jobs succeeded

Partially blocked by environment:
- `gh` is installed but not authenticated. Actions were checked through the GitHub credential manager/API fallback.
- Full local Android APK build on Windows can still be blocked by symlink privileges unless Windows Developer Mode/privilege is enabled. CI/Linux remains the preferred Android release build path.

## Phase B - Next

### B1. Counterparty and Activity

Add structured fields to transactions:
- `counterparty`
- `activity`

Required:
- SQLite migration
- Supabase migration
- Transaction CRUD update
- Transaction form/detail/list UI update
- Sync column update

### B2. Dashboard Widgets

Add:
- Review Queue attention card
- Coverage widget
- Active plans widget

### B3. Feature Gates

Finish product behavior around plans:
- Define feature matrix for `free`, `solo`, `pro`, `team`, owner/tester overrides.
- Use one entitlement helper for all locked/unlocked checks.
- Keep server-side subscription/grant rows as source of truth.

### B4. Team Plan Design

Define before implementation:
- Team ownership model
- Member invitations
- Roles and permissions
- Shared books vs personal books
- Billing owner
- RLS model for team-scoped rows

### B5. Stripe

Pending until Stripe account/products are created:
- Stripe secret key
- Webhook secret
- Price IDs for Solo/Pro/Team
- Checkout and portal wiring
- Webhook subscription sync to Supabase

## Phase C - Later

- Excel import from legacy templates
- Coverage chart refinements
- Recurring form simplification
- Optional local multi-user isolation if the same device must support multiple Supabase accounts

## Operational Notes

Secrets that must be backed up in a password manager:
- `SUPABASE_SERVICE_KEY`
- Supabase anon/publishable key
- GitHub PAT for private/admin automation if still used operationally
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Android keystore, alias and passwords
- Vercel project/team access notes
- Stripe secrets and price IDs when created
- Account recovery codes

Never store service role keys or private signing keys in client code, Git, screenshots, or chat.

## Current Audit Notes

Closed:
- Stronghold/localStorage passphrase fresh-write smell
- Coverage link cleanup before transaction delete
- Restore transaction lock and FK re-enable
- CSP `unsafe-inline`
- Coverage local `user_id` scoping
- Public updater feed without user GitHub token field
- Supabase `subscriptions` write grants for authenticated users
- Supabase composite FK index coverage
- Admin audit log grants restricted to `service_role` with explicit deny policy for authenticated users

Still intentional or environment-bound:
- Stripe billing is not active yet.
- Team plan is design-only until Phase B4.
- Android local full build depends on Windows symlink privilege or CI/Linux.
- Live GitHub Actions inspection requires `gh auth login`.
- Supabase Auth leaked-password protection must be enabled from the Supabase Auth dashboard.
- `delete_current_user()` intentionally remains an authenticated SECURITY DEFINER RPC because it deletes the caller's own auth account.
