export function cleanEnv(value: string | undefined): string | undefined {
  const cleaned = value?.replace(/^\uFEFF/, "").trim();
  return cleaned || undefined;
}

export function requiredEnv(name: string): string {
  const value = cleanEnv(process.env[name]);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}
