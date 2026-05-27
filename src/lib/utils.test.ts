import { describe, expect, it } from "vitest";

import {
  MONTHS_SHORT_EL,
  computeVat,
  formatDateShort,
  formatEuro,
  formatLocalIsoDate,
  round2,
} from "./utils";

describe("formatEuro", () => {
  it("formats with Greek locale and 2 decimals by default", () => {
    const result = formatEuro(1234.56);
    // Greek locale: 1.234,56 €
    expect(result).toContain("1.234");
    expect(result).toContain("56");
    expect(result).toContain("€");
  });

  it("formats compact (no decimals)", () => {
    const result = formatEuro(1234.56, { compact: true });
    expect(result).toContain("1.235");
    expect(result).toContain("€");
    expect(result).not.toContain(",56");
  });

  it("handles zero", () => {
    const result = formatEuro(0);
    expect(result).toContain("0");
    expect(result).toContain("€");
  });

  it("handles negative amounts", () => {
    const result = formatEuro(-500);
    expect(result).toContain("500");
    expect(result).toContain("€");
  });
});

describe("formatDateShort", () => {
  it("returns dd MMM in Greek", () => {
    // January 15, 2025
    const result = formatDateShort("2025-01-15T00:00:00.000Z");
    expect(result).toMatch(/15\s+Ιαν/);
  });

  it("pads single-digit days", () => {
    const result = formatDateShort("2025-05-03T00:00:00.000Z");
    expect(result).toMatch(/03\s+Μαΐ/);
  });
});

describe("MONTHS_SHORT_EL", () => {
  it("has 12 months", () => {
    expect(MONTHS_SHORT_EL).toHaveLength(12);
  });

  it("starts with January and ends with December", () => {
    expect(MONTHS_SHORT_EL[0]).toBe("Ιαν");
    expect(MONTHS_SHORT_EL[11]).toBe("Δεκ");
  });
});

describe("formatLocalIsoDate", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = formatLocalIsoDate(new Date(2025, 0, 5));
    expect(result).toBe("2025-01-05");
  });

  it("pads month and day", () => {
    const result = formatLocalIsoDate(new Date(2025, 2, 9));
    expect(result).toBe("2025-03-09");
  });
});

describe("round2", () => {
  it("rounds to 2 decimal places", () => {
    expect(round2(1.005)).toBe(1);
    expect(round2(1.555)).toBe(1.56);
    expect(round2(0)).toBe(0);
    expect(round2(100)).toBe(100);
  });

  it("handles negative numbers", () => {
    expect(round2(-1.555)).toBe(-1.55);
  });
});

describe("computeVat", () => {
  it("computes 24% VAT correctly", () => {
    const { net, vat } = computeVat(124, 0.24);
    expect(net).toBe(100);
    expect(vat).toBe(24);
  });

  it("returns zero VAT when rate is 0", () => {
    const { net, vat } = computeVat(100, 0);
    expect(net).toBe(100);
    expect(vat).toBe(0);
  });

  it("computes 13% VAT correctly", () => {
    const { net, vat } = computeVat(113, 0.13);
    expect(net).toBe(100);
    expect(vat).toBe(13);
  });

  it("handles small amounts", () => {
    const { net, vat } = computeVat(1.24, 0.24);
    expect(net).toBe(1);
    expect(vat).toBe(0.24);
  });

  it("handles zero gross", () => {
    const { net, vat } = computeVat(0, 0.24);
    expect(net).toBe(0);
    expect(vat).toBe(0);
  });
});
