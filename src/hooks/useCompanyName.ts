import { DEFAULT_COMPANY_NAME, normalizeCompanyName } from "@/lib/company";
import { useAppStore } from "@/lib/store";

export function useCompanyName(): string {
  const companyName = useAppStore((state) => state.companyName);
  return normalizeCompanyName(companyName || DEFAULT_COMPANY_NAME);
}
