import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { secureAuthStorage } from "@/lib/secureAuthStorage";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const missingSupabaseConfigMessage =
  "Missing Supabase env vars. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local";

type RheoSupabaseClient = SupabaseClient<Database>;

let supabaseClient: RheoSupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

function getSupabaseClient(): RheoSupabaseClient {
  if (!url || !anonKey) throw new Error(missingSupabaseConfigMessage);

  supabaseClient ??= createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: secureAuthStorage,
    },
  });

  return supabaseClient;
}

export const supabase = new Proxy({} as RheoSupabaseClient, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseClient(), property, receiver);
  },
});
