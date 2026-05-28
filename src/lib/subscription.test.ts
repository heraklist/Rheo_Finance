import { describe, expect, it } from "vitest";

import {
  featureUpgradeMessage,
  type GatedFeature,
  getTierLimits,
  isFeatureAvailable,
  type SubscriptionTier,
  tierDisplayName,
} from "./subscription";

const ALL_TIERS: SubscriptionTier[] = ["free", "solo", "pro", "team"];

describe("getTierLimits", () => {
  it("returns limits for every tier", () => {
    for (const tier of ALL_TIERS) {
      const limits = getTierLimits(tier);
      expect(limits).toBeDefined();
      expect(typeof limits.maxBooks).toBe("number");
      expect(typeof limits.maxEntriesPerMonth).toBe("number");
      expect(typeof limits.syncEnabled).toBe("boolean");
    }
  });

  it("free tier has restricted limits", () => {
    const limits = getTierLimits("free");
    expect(limits.maxBooks).toBe(1);
    expect(limits.maxEntriesPerMonth).toBe(50);
    expect(limits.syncEnabled).toBe(false);
    expect(limits.receiptsEnabled).toBe(false);
    expect(limits.excelExportEnabled).toBe(false);
  });

  it("solo tier enables sync and receipts", () => {
    const limits = getTierLimits("solo");
    expect(limits.syncEnabled).toBe(true);
    expect(limits.receiptsEnabled).toBe(true);
    expect(limits.excelExportEnabled).toBe(false);
  });

  it("pro tier enables all features", () => {
    const limits = getTierLimits("pro");
    expect(limits.syncEnabled).toBe(true);
    expect(limits.receiptsEnabled).toBe(true);
    expect(limits.excelExportEnabled).toBe(true);
    expect(limits.backupCloudEnabled).toBe(true);
    expect(limits.prioritySupport).toBe(true);
  });

  it("team tier includes everything from pro", () => {
    const pro = getTierLimits("pro");
    const team = getTierLimits("team");
    expect(team.syncEnabled).toBe(pro.syncEnabled);
    expect(team.excelExportEnabled).toBe(pro.excelExportEnabled);
    expect(team.prioritySupport).toBe(true);
  });
});

describe("tierDisplayName", () => {
  it("returns correct display names", () => {
    expect(tierDisplayName("free")).toBe("Free");
    expect(tierDisplayName("solo")).toBe("Solo");
    expect(tierDisplayName("pro")).toBe("Pro");
    expect(tierDisplayName("team")).toBe("Team");
  });
});

describe("isFeatureAvailable", () => {
  it("free tier cannot sync", () => {
    expect(isFeatureAvailable("free", "sync")).toBe(false);
  });

  it("solo tier can sync", () => {
    expect(isFeatureAvailable("solo", "sync")).toBe(true);
  });

  it("free tier cannot export excel", () => {
    expect(isFeatureAvailable("free", "excel_export")).toBe(false);
  });

  it("pro tier can export excel", () => {
    expect(isFeatureAvailable("pro", "excel_export")).toBe(true);
  });

  it("free has limited books", () => {
    expect(isFeatureAvailable("free", "unlimited_books")).toBe(false);
  });

  it("solo has unlimited books", () => {
    expect(isFeatureAvailable("solo", "unlimited_books")).toBe(true);
  });

  const allFeatures: GatedFeature[] = [
    "sync",
    "receipts",
    "excel_export",
    "cloud_backup",
    "unlimited_books",
    "unlimited_entries",
  ];

  it("pro tier has all features", () => {
    for (const feature of allFeatures) {
      expect(isFeatureAvailable("pro", feature)).toBe(true);
    }
  });
});

describe("featureUpgradeMessage", () => {
  it("returns Greek upgrade messages", () => {
    const msg = featureUpgradeMessage("sync");
    expect(msg).toContain("Solo");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("returns message for every gated feature", () => {
    const features: GatedFeature[] = [
      "sync",
      "receipts",
      "excel_export",
      "cloud_backup",
      "unlimited_books",
      "unlimited_entries",
    ];
    for (const f of features) {
      expect(featureUpgradeMessage(f).length).toBeGreaterThan(0);
    }
  });
});
