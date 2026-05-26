# Rheo Finance - Secrets Inventory

This file documents which secrets exist, where to find them, and where they are used.
Do not paste secret values in this file.

## Password Manager Rule

The password manager is the primary disaster-recovery source. Use Bitwarden, 1Password,
or another vault with 2FA and recovery codes.

Store every item below as a separate vault entry or as one structured "Rheo Finance
Production" entry with fields. The repo should contain only names and instructions.

## Account Access To Store

| Account | Why it matters | Where to manage |
|---|---|---|
| GitHub `heraklist` | Repo, Actions, release artifacts, Actions secrets | GitHub account settings |
| Vercel `heraklists-projects` | Landing site, server APIs, production env vars | Vercel dashboard |
| Supabase project `jdwetppniotobfsueyzq` | Auth, database, storage, service keys | Supabase dashboard |
| Stripe | Checkout, portal, webhook, products/prices | Stripe dashboard |

Also store 2FA recovery codes for these accounts in the password manager.

## Vercel Environment Variables

Project: `heraklists-projects/landing`

Dashboard path: Vercel -> Project `landing` -> Settings -> Environment Variables.

Current variables seen in Vercel:

| Variable | Environment | Purpose | Where to find or recreate |
|---|---:|---|---|
| `SUPABASE_URL` | Production | Server APIs call Supabase | Supabase -> Project Settings -> Data API -> Project URL |
| `SUPABASE_SERVICE_KEY` | Production | Server APIs read Auth/admin and write subscriptions | Supabase -> Project Settings -> API Keys -> service role / secret key |
| `ADMIN_GRANT_TOKEN` | Production | Legacy CLI/admin token endpoint `/api/admin/grant` | Local backup currently at `_secrets/vercel/admin-grant-token.txt`; can be rotated by generating a random 32-byte token and updating Vercel |
| `GITHUB_PAT` | Production, Preview | Optional GitHub API token for release download API/rate limits | GitHub -> Settings -> Developer settings -> Personal access tokens |

Variables required if Stripe billing is enabled:

| Variable | Environment | Purpose | Where to find |
|---|---:|---|---|
| `STRIPE_SECRET_KEY` | Production | Creates Checkout/Portal sessions | Stripe -> Developers -> API keys -> Secret key |
| `STRIPE_WEBHOOK_SECRET` | Production | Verifies Stripe webhook signatures | Stripe -> Developers -> Webhooks -> selected endpoint -> Signing secret |
| `STRIPE_PRICE_MONTHLY` | Production | Monthly Solo/paid checkout price ID | Stripe -> Product catalog -> Price ID |
| `STRIPE_PRICE_ANNUAL` | Production | Annual Solo/paid checkout price ID | Stripe -> Product catalog -> Price ID |

Optional admin hardening:

| Variable | Environment | Purpose | Default |
|---|---:|---|---|
| `ADMIN_EMAILS` | Production | Comma-separated admin email allowlist for `/admin/grants` | `heraklis@evochia.gr` |
| `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` | Production | Public Supabase key for admin page login config | Falls back to current publishable key in code |

## GitHub Actions Secrets

Repo path: GitHub -> `heraklist/Rheo_Finance` -> Settings -> Secrets and variables -> Actions.

Current secret names seen in GitHub:

| Secret | Purpose | Where to find or recreate |
|---|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Signs desktop updater packages | Original Tauri updater signing key. If lost, generate a new key and update app config, but existing installed apps may need a manual reinstall to trust the new key. Store in password manager. |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for Tauri signing key | Created with the updater signing key. Store with `TAURI_SIGNING_PRIVATE_KEY`. |
| `ANDROID_KEYSTORE_BASE64` | Base64 encoded Android release keystore | Local backup: `_secrets/android-signing/rheo-release.jks`. Base64 encode it before storing in GitHub. Store raw `.jks` in password manager attachment. |
| `ANDROID_KEYSTORE_PASSWORD` | Android keystore store password | Local backup metadata: `_secrets/android-signing/android-signing.json`. Store in password manager. |
| `ANDROID_KEY_ALIAS` | Android key alias | Local backup metadata: `_secrets/android-signing/android-signing.json`. Store in password manager. |
| `ANDROID_KEY_PASSWORD` | Android key password | Local backup metadata: `_secrets/android-signing/android-signing.json`. Store in password manager. |
| `VITE_SUPABASE_URL` | Build-time Supabase URL for release builds | Supabase Project URL. Currently also hardcoded in workflow env, but keeping the secret is harmless. |
| `VITE_SUPABASE_ANON_KEY` | Build-time public Supabase key for release builds | Supabase publishable key. Currently also hardcoded in workflow env, but keeping the secret is harmless. |

Critical note: the Android keystore is not replaceable for in-place upgrades. If the
keystore is lost, users with the existing signed APK may need uninstall/install.

## Supabase Keys

Project: `jdwetppniotobfsueyzq`

Dashboard path: Supabase -> Project Settings -> Data API / API Keys.

| Key | Client-safe? | Used by | Where to store |
|---|---:|---|---|
| Project URL | Yes | App, landing, Vercel APIs | Password manager note and Vercel env |
| Publishable key `sb_publishable_...` | Yes | Tauri app, landing admin page | Password manager note, GitHub/Vercel env if needed |
| Legacy anon JWT key | Yes but older style | Compatibility only | Password manager note, avoid new usage unless needed |
| Service role / secret key | No | Vercel server APIs only | Password manager secret field and Vercel env only |

Never put the service role key in `VITE_`, client code, GitHub release artifacts, or app config.

## Local `_secrets` Folder

Local path:

```text
C:\Users\herax\Desktop\GPT_\Rheo Finance\_secrets
```

Current files:

| File | Purpose | Password manager action |
|---|---|---|
| `_secrets/vercel/admin-grant-token.txt` | Legacy admin grant bearer token | Store as `ADMIN_GRANT_TOKEN`; can be rotated |
| `_secrets/android-signing/rheo-release.jks` | Android release keystore | Store as encrypted attachment |
| `_secrets/android-signing/android-signing.json` | Android signing metadata/passwords | Store fields separately |

This folder is a convenience backup, not the primary backup.

## What To Put In Password Manager Now

Minimum required entries:

1. GitHub account password, 2FA recovery codes.
2. Vercel account password, 2FA recovery codes.
3. Supabase account password, 2FA recovery codes.
4. Stripe account password, 2FA recovery codes.
5. `SUPABASE_SERVICE_KEY`.
6. `ADMIN_GRANT_TOKEN`.
7. Android `rheo-release.jks` attachment plus store/key passwords and alias.
8. Tauri updater private key and password.
9. Stripe secret key, webhook signing secret, monthly/annual price IDs.
10. GitHub PAT if keeping `GITHUB_PAT` in Vercel.

