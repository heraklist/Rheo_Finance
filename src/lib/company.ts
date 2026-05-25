export const DEFAULT_COMPANY_NAME = "";

const COMPANY_TOKEN = /\b(?:Evochia|Rheo)\b/g;

export function normalizeCompanyName(value: string): string {
  return value.trim();
}

export function replaceCompanyToken(value: string, companyName: string): string {
  const normalized = normalizeCompanyName(companyName);
  // If user hasn't set a company name, keep stored names as-is
  if (!normalized) return value;
  return value.replace(COMPANY_TOKEN, normalized);
}
