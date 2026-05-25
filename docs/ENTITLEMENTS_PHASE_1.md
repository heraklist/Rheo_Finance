# Entitlements Phase 1

Rheo uses Supabase Auth as the identity source. Every app user is identified by
`auth.users.id`, and the active plan is read from `public.subscriptions` through the
Vercel `/api/subscription` endpoint.

## Tiers

- `free`: default for new users with no subscription row.
- `solo`: paid individual plan; sync and receipts enabled.
- `pro`: paid advanced plan; export, plans, cloud backup and priority support enabled.
- `team`: reserved full-access tier for owner/manual grants and the future team workspace model.

The app maps tiers to feature gates in `src/lib/subscription.ts`. UI code should use
`useTier().hasFeature(...)` instead of checking raw tier strings.

## Sources

`public.subscriptions.source` records why the entitlement exists:

- `stripe`: managed by Stripe webhooks.
- `manual`: manually granted access.
- `tester`: temporary tester access.
- `owner`: owner/full access grant.

Manual/tester/owner rows may set `expires_at`. The subscription API returns `free`
when an entitlement is expired, without deleting the row.

## Manual Grants

The server-only endpoint is:

```text
POST /api/admin/grant
Authorization: Bearer <ADMIN_GRANT_TOKEN>
Content-Type: application/json
```

Example owner/full access:

```json
{
  "email": "heraklis@evochia.gr",
  "tier": "team",
  "source": "owner",
  "reason": "Owner full access"
}
```

Example tester access:

```json
{
  "email": "tester@example.com",
  "tier": "solo",
  "source": "tester",
  "expiresAt": "2026-06-30T23:59:59Z",
  "reason": "Beta tester"
}
```

Required Vercel environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_GRANT_TOKEN`

`SUPABASE_SERVICE_KEY` and `ADMIN_GRANT_TOKEN` must never be exposed to the Tauri app or
landing client bundle.

## Phase 2 Boundary

`team` currently means full-access entitlement. It does not yet create shared
workspaces, invitations, member roles, or organization-scoped RLS. That is a separate
phase with `organizations`, `organization_members`, book ownership changes, and sync
changes.
