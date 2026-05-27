import { describe, expect, it } from "vitest";

import {
  canAddBook,
  canAddEntry,
  canCreateScenario,
  canExportExcel,
  canExportPdf,
  getBookLimit,
  getEntitlementSummary,
  getMonthlyEntryLimit,
  getScenarioLimit,
  minimumTierFor,
} from "./entitlements";
import type { SubscriptionTier } from "./subscription";

const ALL_TIERS: SubscriptionTier[] = ["free", "solo", "pro", "team"];

describe("getScenarioLimit", () => {
  it("free tier gets 1 scenario", () => {
    expect(getScenarioLimit("free")).toBe(1);
  });

  it("solo tier gets 5 scenarios", () => {
    expect(getScenarioLimit("solo")).toBe(5);
  });

  it("pro tier gets 50 scenarios", () => {
    expect(getScenarioLimit("pro")).toBe(50);
  });

  it("limits increase with tier", () => {
    const limits = ALL_TIERS.map(getScenarioLimit);
    for (let i = 1; i < limits.length; i++) {
      const prev = limits[i - 1] ?? 0;
      expect(limits[i]).toBeGreaterThanOrEqual(prev);
    }
  });
});

describe("canCreateScenario", () => {
  it("free user with 0 scenarios can create one", () => {
    expect(canCreateScenario("free", 0)).toBe(true);
  });

  it("free user with 1 scenario cannot create another", () => {
    expect(canCreateScenario("free", 1)).toBe(false);
  });

  it("solo user with 4 scenarios can create one more", () => {
    expect(canCreateScenario("solo", 4)).toBe(true);
  });

  it("solo user with 5 scenarios cannot create more", () => {
    expect(canCreateScenario("solo", 5)).toBe(false);
  });
});

describe("canExportExcel / canExportPdf", () => {
  it("free and solo cannot export", () => {
    expect(canExportExcel("free")).toBe(false);
    expect(canExportExcel("solo")).toBe(false);
    expect(canExportPdf("free")).toBe(false);
    expect(canExportPdf("solo")).toBe(false);
  });

  it("pro and team can export", () => {
    expect(canExportExcel("pro")).toBe(true);
    expect(canExportExcel("team")).toBe(true);
    expect(canExportPdf("pro")).toBe(true);
    expect(canExportPdf("team")).toBe(true);
  });
});

describe("entry limits", () => {
  it("free tier has 50/month limit", () => {
    expect(getMonthlyEntryLimit("free")).toBe(50);
  });

  it("canAddEntry respects limit", () => {
    expect(canAddEntry("free", 49)).toBe(true);
    expect(canAddEntry("free", 50)).toBe(false);
    expect(canAddEntry("free", 100)).toBe(false);
  });

  it("solo tier is effectively unlimited", () => {
    expect(canAddEntry("solo", 10_000)).toBe(true);
  });
});

describe("book limits", () => {
  it("free tier has 1 book limit", () => {
    expect(getBookLimit("free")).toBe(1);
  });

  it("canAddBook respects limit", () => {
    expect(canAddBook("free", 0)).toBe(true);
    expect(canAddBook("free", 1)).toBe(false);
  });

  it("solo+ can add many books", () => {
    expect(canAddBook("solo", 10)).toBe(true);
    expect(canAddBook("pro", 100)).toBe(true);
  });
});

describe("getEntitlementSummary", () => {
  it("returns complete summary for each tier", () => {
    for (const tier of ALL_TIERS) {
      const summary = getEntitlementSummary(tier);
      expect(summary.tier).toBe(tier);
      expect(summary.limits).toBeDefined();
      expect(typeof summary.scenarioLimit).toBe("number");
      expect(typeof summary.canSync).toBe("boolean");
      expect(typeof summary.canReceipts).toBe("boolean");
      expect(typeof summary.canExcel).toBe("boolean");
      expect(typeof summary.canCloudBackup).toBe("boolean");
    }
  });

  it("free summary has expected values", () => {
    const s = getEntitlementSummary("free");
    expect(s.canSync).toBe(false);
    expect(s.canReceipts).toBe(false);
    expect(s.canExcel).toBe(false);
    expect(s.canCloudBackup).toBe(false);
    expect(s.scenarioLimit).toBe(1);
  });

  it("pro summary has all features", () => {
    const s = getEntitlementSummary("pro");
    expect(s.canSync).toBe(true);
    expect(s.canReceipts).toBe(true);
    expect(s.canExcel).toBe(true);
    expect(s.canCloudBackup).toBe(true);
  });
});

describe("minimumTierFor", () => {
  it("sync requires solo", () => {
    expect(minimumTierFor("sync")).toBe("solo");
  });

  it("receipts require solo", () => {
    expect(minimumTierFor("receipts")).toBe("solo");
  });

  it("excel_export requires pro", () => {
    expect(minimumTierFor("excel_export")).toBe("pro");
  });

  it("cloud_backup requires pro", () => {
    expect(minimumTierFor("cloud_backup")).toBe("pro");
  });

  it("unlimited_books requires solo", () => {
    expect(minimumTierFor("unlimited_books")).toBe("solo");
  });
});
