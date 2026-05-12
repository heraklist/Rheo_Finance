import { useCallback } from "react";

import { useCompanyName } from "@/hooks/useCompanyName";
import { replaceCompanyToken } from "@/lib/company";

export function useDisplayAccountName(): (value: string | null | undefined) => string {
  const companyName = useCompanyName();

  return useCallback(
    (value) => (value ? replaceCompanyToken(value, companyName) : ""),
    [companyName],
  );
}
