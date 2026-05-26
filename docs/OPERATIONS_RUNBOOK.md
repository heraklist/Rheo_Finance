# Rheo Finance - Operations Runbook

This is the operational checklist for maintaining Rheo Finance without depending on
one local PC.

## Production Surfaces

| Surface | URL / Location | Purpose |
|---|---|---|
| Landing | `https://landing-two-dun-95.vercel.app` | Public website, downloads, auth confirmation page, server APIs |
| Admin grants | `https://landing-two-dun-95.vercel.app/admin/grants` | Browser UI for assigning user plans |
| Supabase | Project `jdwetppniotobfsueyzq` | Auth, Postgres, storage |
| GitHub Releases | `heraklist/Rheo_Finance` releases | Desktop installer, Android APK, update manifests |
| Vercel project | `heraklists-projects/landing` | Landing deploy and serverless API runtime |

## Normal User Plan Management

Use the admin page, not terminal commands:

```text
https://landing-two-dun-95.vercel.app/admin/grants
```

Flow:

1. User signs up in Rheo and confirms email.
2. Open `/admin/grants`.
3. Sign in with an admin Supabase account.
4. Enter user email.
5. Choose tier: `Free`, `Solo`, `Pro`, or `Team`.
6. Choose source: `Manual`, `Tester`, or `Owner`.
7. Optionally set expiry.
8. Save.

Default admin email allowlist:

```text
heraklis@evochia.gr
```

To add more admins, set Vercel env `ADMIN_EMAILS` to a comma-separated list, for
example:

```text
heraklis@evochia.gr,other-admin@example.com
```

Then redeploy the Vercel project.

## Tester Access

Recommended tester grant:

| Field | Value |
|---|---|
| Tier | `Pro` or `Solo` |
| Source | `Tester` |
| Expiry | Set a real date, for example 90 days |
| Reason | `Beta tester access` |

If a tester should lose access immediately, set tier to `Free`.

## Owner Access

Owner grant:

| Field | Value |
|---|---|
| Email | `heraklis@evochia.gr` |
| Tier | `Team` |
| Source | `Owner` |
| Expiry | Empty |
| Reason | `Owner full access` |

`Owner` source only accepts `Team` tier.

## Disaster Recovery After PC Format

The production app keeps running because runtime secrets are stored in Vercel,
GitHub, Supabase, and Stripe. The PC is only a development workstation.

Recovery steps:

1. Install Git, Node.js, pnpm, Rust, Android Studio/SDK, GitHub CLI, Vercel CLI,
   Supabase CLI.
2. Clone repo:

   ```bash
   git clone https://github.com/heraklist/Rheo_Finance.git
   ```

3. Restore local `_secrets` from password manager attachments if local signing work is needed.
4. Verify Vercel env vars exist:

   ```bash
   vercel env ls --cwd landing
   ```

5. Verify GitHub Actions secrets exist:

   ```bash
   gh secret list --repo heraklist/Rheo_Finance
   ```

6. Verify Supabase migrations:

   ```bash
   supabase link --project-ref jdwetppniotobfsueyzq
   supabase migration list --linked
   ```

7. Run local checks:

   ```bash
   pnpm install
   pnpm typecheck
   pnpm lint
   pnpm build
   cargo check --manifest-path src-tauri/Cargo.toml
   ```

On Windows PowerShell, use `pnpm.cmd` if script execution policy blocks `pnpm`.

## Vercel Maintenance

Important env vars are listed in `docs/SECRETS_INVENTORY.md`.

After changing Vercel env vars:

1. Redeploy production:

   ```bash
   vercel deploy --prod --cwd landing
   ```

2. Smoke test:

   ```text
   https://landing-two-dun-95.vercel.app
   https://landing-two-dun-95.vercel.app/admin/grants
   ```

3. For protected API checks, sign into the admin page rather than using the legacy
   token endpoint.

## Supabase Maintenance

Before changing database schema:

1. Create migration file.
2. Keep RLS enabled on every public table.
3. Grant only the roles needed:
   - `authenticated` for app Data API usage, protected by RLS.
   - `service_role` for Vercel server APIs.
4. Apply and verify:

   ```bash
   supabase db push --include-all
   supabase migration list --linked
   ```

5. Check admin grant flow after subscription-related migrations.

## GitHub Release Maintenance

Release tags trigger the GitHub Actions `Release` workflow.

Before tagging:

1. Bump version in:
   - `package.json`
   - `src-tauri/Cargo.toml`
   - `src-tauri/Cargo.lock`
   - `src-tauri/tauri.conf.json`
2. Run verification:

   ```bash
   pnpm typecheck
   pnpm lint
   pnpm build
   cargo check --manifest-path src-tauri/Cargo.toml
   ```

3. Commit and tag:

   ```bash
   git commit -m "..."
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```

4. Verify GitHub Actions:

   ```bash
   gh run list --repo heraklist/Rheo_Finance
   gh release view vX.Y.Z --repo heraklist/Rheo_Finance
   ```

## Secret Rotation

| Secret | Can rotate safely? | Notes |
|---|---:|---|
| `ADMIN_GRANT_TOKEN` | Yes | Update Vercel env and redeploy. Admin page does not depend on it. |
| `SUPABASE_SERVICE_KEY` | Yes, with care | Rotate in Supabase, update Vercel env, redeploy, test APIs. |
| Supabase publishable key | Yes | Update app build envs and Vercel if changed. Existing installed apps may need app update if old key disabled. |
| GitHub PAT | Yes | Update Vercel env or remove if no longer needed. |
| Stripe secret key | Yes | Update Vercel env and test checkout/portal/webhook. |
| Stripe webhook secret | Yes | Update Vercel env after replacing webhook endpoint secret. |
| Android keystore | No for existing app upgrades | Losing/replacing it can force users to uninstall/reinstall. Keep multiple encrypted backups. |
| Tauri updater signing key | High-risk | Existing desktop updater trust depends on the configured public key. Rotate only with planned manual update path. |

## Emergency Checks

If login/signup breaks:

1. Supabase Auth settings:
   - Site URL should point to landing.
   - Redirect URLs should include landing confirmation URL.
2. Vercel env:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
3. Landing route:
   - `/auth/confirmed`

If admin grants break:

1. Open `/admin/grants`.
2. Confirm admin account can sign in.
3. Check Vercel function logs.
4. Check `public.subscriptions` table privileges and RLS.
5. Confirm migration `013_service_role_api_grants.sql` is applied.

If downloads break:

1. Check latest GitHub release assets.
2. Check `latest-desktop.json` and `latest-android.json`.
3. Check landing `/api/download?platform=windows` and `/api/download?platform=android`.

