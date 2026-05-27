# SaaS Test Contracts — Rheo Finance

Status: Draft (v0.2.25)

---

## 1. Login / Logout

**Testable now:**
- Login form renders
- Email/password validation (client-side)
- TOTP MFA form displays when MFA is enabled
- Logout clears local state

**Not testable yet:**
- End-to-end login with real Supabase credentials in CI
- Session persistence across app restarts (requires Tauri runtime)

**Required implementation:**
- Supabase Auth is fully implemented
- Stronghold/DPAPI session storage works on desktop

**Recommended Vitest:**
- `normalizeSubscriptionTier` / `normalizeSubscriptionSource` validators
- `clearSubscriptionCache` clears state

**Recommended Playwright:**
- Login page renders
- Invalid email shows error
- MFA prompt appears (mock scenario)

---

## 2. Workspace Isolation

**Testable now:**
- Each user sees only their own data (enforced by RLS)
- `user_id` is set on all mutations

**Not testable yet:**
- Multi-user concurrent access in e2e
- Cross-user data leak regression

**Required implementation:**
- Already enforced via Supabase RLS (`auth.uid() = user_id` on all 12 tables)

**Recommended Vitest:**
- Verify `toRemoteRow` always includes `user_id`

**Recommended Playwright:**
- Verify login user sees only their transactions (requires test accounts)

---

## 3. Plan Gating

**Testable now:**
- `isFeatureAvailable(tier, feature)` for all tier/feature combos
- `getTierLimits` returns correct limits per tier
- `canCreateScenario`, `canAddEntry`, `canAddBook` boundary checks
- `canExportExcel`, `canExportPdf` per tier

**Not testable yet:**
- UI shows upgrade prompts when feature is gated (requires mock tier injection)
- Real-time tier changes propagate to UI

**Required implementation:**
- `useTier` hook fetches from API — works with real subscription
- Entitlement checks are pure functions (fully testable)

**Recommended Vitest:**
- `src/lib/entitlements.test.ts` (implemented)
- `src/lib/subscription.test.ts` (implemented)

**Recommended Playwright:**
- Export button hidden for free tier (when mock tier is available)

---

## 4. Upgrade / Downgrade

**Testable now:**
- Tier display names render correctly
- Subscription card UI shows tiers

**Not testable yet:**
- Actual Stripe checkout flow
- Post-upgrade tier change reflected in app
- Downgrade preserves data, restricts features

**Required implementation:**
- Stripe integration (not implemented)
- Webhook → Supabase subscription update

**Recommended Vitest:**
- `tierDisplayName` for all tiers (implemented)

**Recommended Playwright:**
- Upgrade button navigates to correct URL (when available)

---

## 5. Failed Payment Behavior

**Testable now:**
- `SubscriptionStatus` type includes "past_due"
- `useTier` reports `hasWarning` for past_due

**Not testable yet:**
- Actual Stripe webhook for failed payment
- Grace period behavior
- Feature degradation on expired subscription

**Required implementation:**
- Stripe webhooks for payment failure events
- Grace period logic in subscription.ts

**Recommended Vitest:**
- Verify `hasWarning` is true when status = "past_due"

**Recommended Playwright:**
- Warning banner shows for past_due status (when injectable)

---

## 6. Export Availability by Plan

**Testable now:**
- `canExportExcel("free")` returns false
- `canExportExcel("pro")` returns true
- `minimumTierFor("excel_export")` returns "pro"

**Not testable yet:**
- Export button actually produces file (export is Phase 4 stub)

**Required implementation:**
- Excel export (Phase 4)

**Recommended Vitest:**
- `src/lib/entitlements.test.ts` — export gating (implemented)

**Recommended Playwright:**
- Export button visibility per tier (when tier injection is available)

---

## 7. Scenario Limits by Plan

**Testable now:**
- `getScenarioLimit` per tier
- `canCreateScenario` boundary logic

**Not testable yet:**
- PlanBuilder UI enforces limit
- Limit violation shows upgrade prompt

**Required implementation:**
- PlanBuilder needs to check `canCreateScenario` before save

**Recommended Vitest:**
- `src/lib/entitlements.test.ts` — scenario limits (implemented)

**Recommended Playwright:**
- PlanBuilder blocks save at limit (when wired)

---

## 8. Billing Portal Access

**Testable now:**
- Nothing (Stripe not integrated)

**Not testable yet:**
- Manage subscription button opens Stripe portal
- Portal redirects back to app

**Required implementation:**
- Stripe Customer Portal setup
- API endpoint to create portal session

**Recommended Vitest:**
- N/A until Stripe integration

**Recommended Playwright:**
- Button click opens portal URL (when available)

---

## 9. Mobile Responsive Dashboard

**Testable now:**
- App renders on 375px viewport (Playwright mobile project)
- Root container is visible

**Not testable yet:**
- Dashboard KPI tiles layout at mobile width (requires auth)
- Touch interactions (gestures, swipe)

**Required implementation:**
- Already responsive via Tailwind mobile-first

**Recommended Vitest:**
- N/A (layout is CSS)

**Recommended Playwright:**
- Mobile viewport smoke test (implemented in `e2e/smoke.spec.ts`)
- Dashboard renders at 375px (when auth is bypassable)
