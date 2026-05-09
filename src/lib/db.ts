import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;

/**
 * Get (or initialize) the local SQLite database instance.
 * Tauri's sql plugin runs migrations automatically on first connection
 * (configured in tauri.conf.json + lib.rs).
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  dbInstance = await Database.load("sqlite:evochia.db");
  return dbInstance;
}

/**
 * Generate a UUIDv4. Used for entity primary keys client-side.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older runtimes
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Current ISO timestamp (UTC).
 */
export function now(): string {
  return new Date().toISOString();
}
