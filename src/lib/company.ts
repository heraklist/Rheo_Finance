export const DEFAULT_COMPANY_NAME = "Evochia";

const COMPANY_TOKEN = /\bEvochia\b/g;

export function normalizeCompanyName(value: string): string {
  const trimmed = value.trim();
  return trimmed || DEFAULT_COMPANY_NAME;
}

export function replaceCompanyToken(value: string, companyName: string): string {
  return value.replace(COMPANY_TOKEN, normalizeCompanyName(companyName));
}
