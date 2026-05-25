import { useCallback, useEffect, useState } from "react";

import { useAppStore } from "@/lib/store";
import {
  DEFAULT_SUBSCRIPTION,
  type GatedFeature,
  type SubscriptionInfo,
  type SubscriptionTier,
  type TierLimits,
  clearSubscriptionCache,
  featureUpgradeMessage,
  fetchSubscription,
  getTierLimits,
  isFeatureAvailable,
  tierDisplayName,
} from "@/lib/subscription";

interface UseTierResult {
  /** Current tier: "free" | "pro" */
  tier: SubscriptionTier;
  /** Full subscription info */
  subscription: SubscriptionInfo;
  /** Current tier's feature limits */
  limits: TierLimits;
  /** Display name for the tier */
  displayName: string;
  /** Whether a specific feature is available */
  hasFeature: (feature: GatedFeature) => boolean;
  /** Get upgrade message for a locked feature */
  upgradeMessage: (feature: GatedFeature) => string;
  /** Whether the subscription is actively paid (not free) */
  isPro: boolean;
  /** Whether subscription is past due or about to cancel */
  hasWarning: boolean;
  /** Loading state during initial fetch */
  loading: boolean;
  /** Force refresh subscription status */
  refresh: () => Promise<void>;
}

/**
 * React hook for subscription tier checking and feature gating.
 *
 * Usage:
 * ```tsx
 * const { tier, hasFeature, isPro } = useTier();
 *
 * if (!hasFeature("sync")) {
 *   return <UpgradePrompt feature="sync" />;
 * }
 * ```
 */
export function useTier(): UseTierResult {
  const user = useAppStore((s) => s.user);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUBSCRIPTION);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const info = await fetchSubscription(user.id);
      setSubscription(info);
    } catch {
      // Keep cached/default on error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const refresh = useCallback(async () => {
    clearSubscriptionCache();
    await loadSubscription();
  }, [loadSubscription]);

  const tier = subscription.tier;
  const limits = getTierLimits(tier);

  return {
    tier,
    subscription,
    limits,
    displayName: tierDisplayName(tier),
    hasFeature: (feature: GatedFeature) => isFeatureAvailable(tier, feature),
    upgradeMessage: (feature: GatedFeature) => featureUpgradeMessage(feature),
    isPro: tier === "pro",
    hasWarning: subscription.status === "past_due" || subscription.cancelAtPeriodEnd,
    loading,
    refresh,
  };
}
