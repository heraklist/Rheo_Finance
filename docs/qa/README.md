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
| Workspace isolation | N/A | N/A | Multi-user test setup |
