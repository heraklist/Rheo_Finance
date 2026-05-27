/**
 * Pure entitlement logic — no React, no Supabase, no side effects.
 *
 * This module extracts feature-gating rules into testable pure functions.
 * Business rules here are a DRAFT contract based on current tier definitions
 * in subscription.ts. Final pricing/limits will be finalized before launch.
 *
 * Import from subscription.ts for the canonical type definitions.
 */

import type { GatedFeature, SubscriptionTier, TierLimits } from "@/lib/subscription";
import { getTierLimits, isFeatureAvailable } from "@/lib/subscription";

// ─── Scenario / Plan Limits ──────────────────────────────────

/** Maximum saved scenarios per tier (draft — not finalized). */
const SCENARIO_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  solo: 5,
  pro: 50,
  team: 50,
};

export function getScenarioLimit(tier: SubscriptionTier): number {
  return SCENARIO_LIMITS[tier] ?? SCENARIO_LIMITS.free;
}

export function canCreateScenario(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < getScenarioLimit(tier);
}

// ─── Export Availability ─────────────────────────────────────

export function canExportExcel(tier: SubscriptionTier): boolean {
  return isFeatureAvailable(tier, "excel_export");
}

export function canExportPdf(tier: SubscriptionTier): boolean {
  // PDF export follows same gating as Excel (Pro+)
  return isFeatureAvailable(tier, "excel_export");
}

// ─── Entry Limits ────────────────────────────────────────────

export function getMonthlyEntryLimit(tier: SubscriptionTier): number {
  return getTierLimits(tier).maxEntriesPerMonth;
}

export function canAddEntry(tier: SubscriptionTier, currentMonthCount: number): boolean {
  return currentMonthCount < getMonthlyEntryLimit(tier);
}

// ─── Book Limits ─────────────────────────────────────────────

export function getBookLimit(tier: SubscriptionTier): number {
  return getTierLimits(tier).maxBooks;
}

export function canAddBook(tier: SubscriptionTier, currentBookCount: number): boolean {
  return currentBookCount < getBookLimit(tier);
}

// ─── Feature Summary ─────────────────────────────────────────

export interface EntitlementSummary {
  tier: SubscriptionTier;
  limits: TierLimits;
  scenarioLimit: number;
  canSync: boolean;
  canReceipts: boolean;
  canExcel: boolean;
  canCloudBackup: boolean;
}

export function getEntitlementSummary(tier: SubscriptionTier): EntitlementSummary {
  const limits = getTierLimits(tier);
  return {
    tier,
    limits,
    scenarioLimit: getScenarioLimit(tier),
    canSync: limits.syncEnabled,
    canReceipts: limits.receiptsEnabled,
    canExcel: limits.excelExportEnabled,
    canCloudBackup: limits.backupCloudEnabled,
  };
}

// ─── Upgrade Recommendations ─────────────────────────────────

/** Returns the minimum tier needed for a feature, or null if already available. */
export function minimumTierFor(feature: GatedFeature): SubscriptionTier {
  const tiers: SubscriptionTier[] = ["free", "solo", "pro", "team"];
  for (const tier of tiers) {
    if (isFeatureAvailable(tier, feature)) return tier;
  }
  return "pro"; // fallback
}
