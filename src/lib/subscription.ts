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

export type SubscriptionTier = "free" | "solo" | "pro" | "team";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";
export type SubscriptionSource = "stripe" | "manual" | "tester" | "owner";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  source: SubscriptionSource;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: string | null;
}

export const DEFAULT_SUBSCRIPTION: SubscriptionInfo = {
  tier: "free",
  status: "active",
  source: "stripe",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  expiresAt: null,
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

const SOLO_LIMITS: TierLimits = {
  maxBooks: 999,
  maxEntriesPerMonth: 999_999,
  syncEnabled: true,
  receiptsEnabled: true,
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

const TEAM_LIMITS: TierLimits = {
  ...PRO_LIMITS,
  prioritySupport: true,
};

export function getTierLimits(tier: SubscriptionTier): TierLimits {
  switch (tier) {
    case "solo":
      return SOLO_LIMITS;
    case "pro":
      return PRO_LIMITS;
    case "team":
      return TEAM_LIMITS;
    default:
      return FREE_LIMITS;
  }
}

export function tierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case "solo":
      return "Solo";
    case "pro":
      return "Pro";
    case "team":
      return "Team";
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
      return "Το cloud sync είναι διαθέσιμο στο Solo και άνω.";
    case "receipts":
      return "Οι αποδείξεις & φωτογραφίες είναι διαθέσιμες στο Solo και άνω.";
    case "excel_export":
      return "Η εξαγωγή Excel είναι διαθέσιμη στο Pro και άνω.";
    case "cloud_backup":
      return "Το cloud backup είναι διαθέσιμο στο Pro και άνω.";
    case "unlimited_books":
      return "Περισσότερα books είναι διαθέσιμα στο Solo και άνω.";
    case "unlimited_entries":
      return "Περισσότερες μηνιαίες καταχωρήσεις είναι διαθέσιμες στο Solo και άνω.";
    default:
      return "Αναβαθμίστε για πρόσβαση.";
  }
}

// ─── Subscription Check API ───────────────────────────────────

const API_BASE = import.meta.env.VITE_LANDING_URL as string | undefined;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedSub: SubscriptionInfo | null = null;
let cachedUserId: string | null = null;
let cachedAt = 0;

/**
 * Fetch subscription status from the Vercel API.
 * Caches result per user for 5 minutes to avoid stale cross-user entitlements
 * on shared devices or after logout/login flows.
 */
export async function fetchSubscription(userId: string): Promise<SubscriptionInfo> {
  const now = Date.now();
  if (cachedSub && cachedUserId === userId && now - cachedAt < CACHE_TTL_MS) {
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
    if (!accessToken || session.user.id !== userId) {
      return DEFAULT_SUBSCRIPTION;
    }

    const res = await fetch(`${API_BASE}/api/subscription?userId=${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) {
      return cachedUserId === userId ? (cachedSub ?? DEFAULT_SUBSCRIPTION) : DEFAULT_SUBSCRIPTION;
    }

    const data = await res.json();
    const info: SubscriptionInfo = {
      tier: normalizeSubscriptionTier(data.tier),
      status: data.status ?? "active",
      source: normalizeSubscriptionSource(data.source),
      currentPeriodEnd: data.current_period_end ?? null,
      cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
      expiresAt: data.expires_at ?? null,
    };

    cachedSub = info;
    cachedUserId = userId;
    cachedAt = now;
    return info;
  } catch {
    return cachedUserId === userId ? (cachedSub ?? DEFAULT_SUBSCRIPTION) : DEFAULT_SUBSCRIPTION;
  }
}

/** Reset cache (e.g., after upgrade, logout, or account deletion) */
export function clearSubscriptionCache(): void {
  cachedSub = null;
  cachedUserId = null;
  cachedAt = 0;
}

function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  if (value === "solo" || value === "pro" || value === "team") return value;
  return "free";
}

function normalizeSubscriptionSource(value: unknown): SubscriptionSource {
  if (value === "manual" || value === "tester" || value === "owner") return value;
  return "stripe";
}
