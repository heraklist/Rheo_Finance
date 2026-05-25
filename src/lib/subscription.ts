/**
 * Subscription tier definitions and feature gating.
 *
 * Tier data flows:
 *   Stripe → Webhook → Supabase `subscriptions` table → Vercel API → App
 *
 * The app checks tier via the /api/subscription endpoint on the landing site,
 * caches result locally, and gates features based on tier limits.
 */

import { supabase } from "@/lib/supabase";

export type SubscriptionTier = "free" | "pro";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  tier: "free",
  status: "active",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

// ─── Feature Limits per Tier ──────────────────────────────────

export interface TierLimits {
  maxBooks: number;
  maxEntriesPerMonth: number;
  syncEnabled: boolean;
  receiptsEnabled: boolean;
  excelExportEnabled: boolean;
  forecastEnabled: boolean;
  recurringEnabled: boolean;
  backupCloudEnabled: boolean;
  prioritySupport: boolean;
}

const FREE_LIMITS: TierLimits = {
  maxBooks: 1,
  maxEntriesPerMonth: 50,
  syncEnabled: false,
  receiptsEnabled: false,
  excelExportEnabled: false,
  forecastEnabled: true,
  recurringEnabled: true,
  backupCloudEnabled: false,
  prioritySupport: false,
};

const PRO_LIMITS: TierLimits = {
  maxBooks: 999,
  maxEntriesPerMonth: 999_999,
  syncEnabled: true,
  receiptsEnabled: true,
  excelExportEnabled: true,
  forecastEnabled: true,
  recurringEnabled: true,
  backupCloudEnabled: true,
  prioritySupport: true,
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  switch (tier) {
    case "pro":
      return PRO_LIMITS;
    default:
      return FREE_LIMITS;
  }
}

export function tierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case "pro":
      return "Pro";
    default:
      return "Free";
  }
}

// ─── Feature Gate Checks ──────────────────────────────────────

export type GatedFeature =
  | "sync"
  | "receipts"
  | "excel_export"
  | "cloud_backup"
  | "unlimited_books"
  | "unlimited_entries";

export function isFeatureAvailable(tier: SubscriptionTier, feature: GatedFeature): boolean {
  const limits = getTierLimits(tier);
  switch (feature) {
    case "sync":
      return limits.syncEnabled;
    case "receipts":
      return limits.receiptsEnabled;
    case "excel_export":
      return limits.excelExportEnabled;
    case "cloud_backup":
      return limits.backupCloudEnabled;
    case "unlimited_books":
      return limits.maxBooks > 1;
    case "unlimited_entries":
      return limits.maxEntriesPerMonth > 50;
    default:
      return false;
  }
}

export function featureUpgradeMessage(feature: GatedFeature): string {
  switch (feature) {
    case "sync":
      return "Το cloud sync είναι διαθέσιμο στο Pro.";
    case "receipts":
      return "Οι αποδείξεις & φωτογραφίες είναι διαθέσιμες στο Pro.";
    case "excel_export":
      return "Η εξαγωγή Excel είναι διαθέσιμη στο Pro.";
    case "cloud_backup":
      return "Το cloud backup είναι διαθέσιμο στο Pro.";
    case "unlimited_books":
      return "Απεριόριστα βιβλία στο Pro.";
    case "unlimited_entries":
      return "Απεριόριστες καταχωρήσεις στο Pro.";
    default:
      return "Αναβαθμίστε στο Pro για πρόσβαση.";
  }
}

// ─── Subscription Check API ───────────────────────────────────

const API_BASE = import.meta.env.VITE_LANDING_URL as string | undefined;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSub: SubscriptionInfo | null = null;
let cachedAt = 0;

/**
 * Fetch subscription status from the Vercel API.
 * Caches result for 5 minutes to avoid excessive calls.
 */
export async function fetchSubscription(userId: string): Promise<SubscriptionInfo> {
  const now = Date.now();
  if (cachedSub && now - cachedAt < CACHE_TTL_MS) {
    return cachedSub;
  }

  if (!API_BASE) {
    return DEFAULT_SUBSCRIPTION;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      return DEFAULT_SUBSCRIPTION;
    }

    const res = await fetch(`${API_BASE}/api/subscription?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      return cachedSub ?? DEFAULT_SUBSCRIPTION;
    }

    const data = await res.json();
    const info: SubscriptionInfo = {
      tier: data.tier ?? "free",
      status: data.status ?? "active",
      currentPeriodEnd: data.current_period_end ?? null,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
    };

    cachedSub = info;
    cachedAt = now;
    return info;
  } catch {
    return cachedSub ?? DEFAULT_SUBSCRIPTION;
  }
}

/** Reset cache (e.g., after upgrade or on logout) */
export function clearSubscriptionCache(): void {
  cachedSub = null;
  cachedAt = 0;
}
