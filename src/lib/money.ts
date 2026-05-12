import { formatEuro } from "@/lib/utils";

function hasValidThousandsGroups(value: string): boolean {
  return /^-?\d{1,3}(\.\d{3})+$/.test(value);
}

/**
 * Parse a Greek-formatted money string.
 * Accepts: "1.234,56", "1234.56", "1234,56", "1234".
 * Rejects malformed input such as "12abc", "1,2,3", "1..5", empty values.
 */
export function parseGreekAmount(input: string): number | null {
  const trimmed = input.trim().replace(/\s+/g, "").replace(/€$/, "");
  if (!trimmed) return null;

  if (!/^-?[\d.]*,?\d*$/.test(trimmed)) return null;

  let normalized: string;
  if (trimmed.includes(",")) {
    const [intPart, decPart, ...rest] = trimmed.split(",");
    if (rest.length > 0 || intPart === undefined || intPart.length === 0) return null;
    if (intPart.includes(".") && !hasValidThousandsGroups(intPart)) return null;

    const intClean = intPart.replace(/\./g, "");
    if (!/^-?\d+$/.test(intClean)) return null;
    if (decPart !== undefined && !/^\d+$/.test(decPart)) return null;
    normalized = decPart !== undefined ? `${intClean}.${decPart}` : intClean;
  } else {
    const dots = (trimmed.match(/\./g) ?? []).length;
    if (dots > 1) {
      if (!hasValidThousandsGroups(trimmed)) return null;
      normalized = trimmed.replace(/\./g, "");
    } else {
      normalized = trimmed;
    }
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

export { formatEuro };
