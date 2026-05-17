import { useCallback } from "react";

import { useCompanyName } from "@/hooks/useCompanyName";
import { replaceCompanyToken } from "@/lib/company";

export function useDisplayAccountName(): (value: string | null | undefined) => string {
  const companyName = useCompanyName();

  return useCallback(
    (value) => {
      if (!value) return "";
      // If user has a company name set, replace the Rheo token with it.
      // If empty (new users), keep the stored name as-is.
      if (companyName.trim()) {
        return replaceCompanyToken(value, companyName);
      }
      return value;
    },
    [companyName],
  );
}
