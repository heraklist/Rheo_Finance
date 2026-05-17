import { useAppStore } from "@/lib/store";

/**
 * Returns the user's configured company name, or empty string if not set.
 */
export function useCompanyName(): string {
  return useAppStore((s) => s.companyName);
}

/**
 * Returns the company name, or null if empty. Use this when you want to skip
 * rendering company-specific UI for new users.
 */
export function useCompanyNameOrNull(): string | null {
  const name = useAppStore((s) => s.companyName);
  return name.trim() ? name : null;
}
