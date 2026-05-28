# QA & Developer Quality Pipeline

## Local Commands

| Command | What it does |
|---------|-------------|
| `pnpm lint` | Biome lint + format check |
| `pnpm typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `pnpm test` | Vitest unit tests (jsdom) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm build` | Production build (tsc + vite) |
| `pnpm e2e` | Playwright smoke tests |
| `pnpm e2e:ui` | Playwright with UI inspector |
| `pnpm security:secrets` | Gitleaks secret scan |
| `pnpm security:semgrep` | Semgrep static analysis |
| `pnpm quality:all` | Full local gate: lint + typecheck + test + build |

## Quick Local Quality Gate

```bash
pnpm quality:all
```

Runs: lint, typecheck, unit tests, production build. Takes ~30 seconds.

## Unit Tests (Vitest)

```bash
pnpm test           # single run
pnpm test:watch     # watch mode
```

Test files: `src/**/*.test.ts`

Current coverage:
- `src/lib/utils.test.ts` — formatEuro, formatDateShort, computeVat, round2
- `src/lib/subscription.test.ts` — getTierLimits, isFeatureAvailable, tierDisplayName
- `src/lib/entitlements.test.ts` — scenario limits, export gating, entry/book limits

## Playwright E2E

```bash
# Install browsers first (one-time)
npx playwright install chromium

# Run tests
pnpm e2e

# Interactive UI mode
pnpm e2e:ui
```

Current smoke tests:
- App loads without crashing
- Login page renders
- Mobile viewport renders

Note: E2E tests run against Vite dev server (localhost:1420). They test the
frontend only — Tauri shell features (SQLite, Stronghold, etc.) are not available.

## Gitleaks (Secret Scanning)

Requires [Gitleaks](https://github.com/gitleaks/gitleaks) installed locally.

```bash
# Install (Windows - scoop)
scoop install gitleaks

# Or download from releases:
# https://github.com/gitleaks/gitleaks/releases

# Run
pnpm security:secrets
```

Scans the repo for accidentally committed secrets, API keys, tokens.

## Semgrep (Static Analysis)

Requires [Semgrep](https://semgrep.dev/) installed locally.

```bash
# Install
pip install semgrep
# or
pipx install semgrep

# Run
pnpm security:semgrep
```

Runs basic auto-config rules. Does NOT require Semgrep cloud login.
If `semgrep login` is requested, you can skip it — local scanning works without auth.

Limitation: Some advanced rules require Semgrep Pro (cloud). The local scan
covers OWASP basics and common vulnerability patterns.

## Sentry (Error Tracking)

Scaffold is ready in `src/lib/sentry.ts`. No-ops if DSN is missing.

To enable:
1. Create a Sentry project at https://sentry.io
2. Add to `.env.local`:
   ```
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
3. Install SDK: `pnpm add @sentry/react`
4. Call `initSentry()` in `main.tsx`

Financial data (amounts, balances, IBAN) is automatically redacted from error reports.

## GitHub Actions CI

`.github/workflows/ci.yml` runs on:
- Push to `main`
- Pull requests

CI steps:
1. Install dependencies (pnpm, frozen lockfile)
2. Lint (Biome)
3. TypeScript check
4. Unit tests (Vitest)
5. Build (vite production build)

Playwright is NOT in CI yet — frontend tests need the Vite dev server
and currently test against the browser (not Tauri). Enable later by adding:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps chromium
- name: E2E tests
  run: pnpm e2e
```

## Dependabot

`.github/dependabot.yml` checks npm dependencies weekly and opens PRs.

## Supabase Local Testing (Database QA)

### Prerequisites

- [Docker](https://www.docker.com/) running locally
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npm i -g supabase`)
- Node.js 22+

### Commands

| Command | What it does |
|---------|-------------|
| `pnpm supabase:start` | Start local Supabase (Docker) |
| `pnpm supabase:stop` | Stop local Supabase |
| `pnpm supabase:reset` | Reset DB: runs all migrations from scratch |
| `pnpm supabase:test` | Run pgTAP database tests |
| `pnpm supabase:lint` | Lint migrations for issues |
| `pnpm supabase:types` | Regenerate TypeScript types from local DB |
| `pnpm db:check` | Full pipeline: reset + lint + test + types |

### Quick Start

```bash
# Start local Supabase (first time takes a few minutes to pull Docker images)
pnpm supabase:start

# Run the full database QA pipeline
pnpm db:check

# Stop when done
pnpm supabase:stop
```

### Database Tests

Test files: `supabase/tests/database/*.test.sql`

Current coverage:

| Test file | What it covers |
|-----------|---------------|
| `00_extensions.test.sql` | pgTAP setup verification |
| `00_schema_integrity.test.sql` | Tables, columns, constraints, indexes, triggers |
| `01_rls_enabled.test.sql` | RLS policies on all 12 user tables + 3 admin tables, anon denial |
| `02_workspace_isolation.test.sql` | User A cannot see/modify User B data, cross-user CRUD blocked |
| `03_subscription_billing.test.sql` | Tier/status/source constraints, uniqueness, read-only for users |
| `04_admin_tables.test.sql` | Admin tables deny authenticated access, service_role-only |
| `05_data_constraints.test.sql` | Check constraints on all enums, generated VAT columns, FK integrity |

### Running Individual Tests

```bash
# Run all database tests
pnpm supabase:test

# The test runner (pg_prove) runs files in alphabetical order.
# All tests use BEGIN/ROLLBACK so they don't leave data behind.
```

### Regenerating TypeScript Types

After any migration change:

```bash
pnpm supabase:start          # if not running
pnpm supabase:reset           # apply latest migrations
pnpm supabase:types           # generates src/lib/database.types.ts
```

### What Runs Locally vs CI

| Check | Local | CI |
|-------|-------|----|
| Migration reset | Docker required | Not yet (needs Supabase CLI in CI) |
| Database lint | Docker required | Not yet |
| pgTAP tests | Docker required | Not yet |
| TypeScript types | Docker required | Not yet |
| Unit tests (Vitest) | Always | Always |
| Lint + typecheck | Always | Always |

To enable Supabase in CI later, add Supabase CLI + Docker to the CI workflow:

```yaml
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v2
- name: Start Supabase
  run: supabase start
- name: Database QA
  run: pnpm db:check
```

### Edge Functions

No Edge Functions exist yet. When added:
- Files go in `supabase/functions/`
- Tests go in `supabase/functions/tests/`
- Add scripts: `supabase:functions`, `supabase:functions:test`
- Requires Deno runtime locally

### What Is NOT Tested (Blocked)

| Feature | Blocked by |
|---------|-----------|
| Stripe webhook → subscription update | Stripe integration not implemented |
| Grace period on failed payment | Stripe webhooks not implemented |
| Billing portal redirect | Stripe Customer Portal not configured |
| Storage signed URL access | Manual testing only (depends on Supabase Storage config) |
| Cross-user E2E isolation | Requires real Supabase Auth test accounts in CI |

See [saas-test-contracts.md](./saas-test-contracts.md) for detailed per-feature breakdown.

---

## SaaS Test Contracts

See [saas-test-contracts.md](./saas-test-contracts.md) for detailed breakdown of:
- What is testable now per SaaS feature
- What is blocked and why
- Recommended test coverage per feature

### Summary

| Feature | Unit tests | E2E tests | Blocked by |
|---------|-----------|-----------|------------|
| Plan gating | Done | Pending | Mock tier injection |
| Scenario limits | Done | Pending | PlanBuilder wiring |
| Export by plan | Done | Pending | Excel export (Phase 4) |
| Entry limits | Done | Pending | UI enforcement |
| Login/logout | Partial | Smoke | CI test accounts |
| Upgrade/downgrade | N/A | N/A | Stripe integration |
| Failed payment | N/A | N/A | Stripe webhooks |
| Billing portal | N/A | N/A | Stripe portal |
| Mobile dashboard | N/A | Smoke | Auth bypass for e2e |
| Workspace isolation | **pgTAP** | N/A | E2E needs CI auth accounts |
