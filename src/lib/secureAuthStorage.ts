import { isTauri } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { platform } from "@tauri-apps/plugin-os";
import { type Client, type Store, Stronghold } from "@tauri-apps/plugin-stronghold";

interface AuthStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

interface StrongholdState {
  stronghold: Stronghold;
  store: Store;
}

const CLIENT_NAME = "supabase-auth";
const SNAPSHOT_FILE = "supabase-auth.stronghold";
const STORAGE_KEY_PREFIX = "supabase:";

let strongholdStatePromise: Promise<StrongholdState> | null = null;
let strongholdAvailable: boolean | null = null;

function localGetItem(key: string): string | null {
  return window.localStorage.getItem(key);
}

function localSetItem(key: string, value: string): void {
  window.localStorage.setItem(key, value);
}

function localRemoveItem(key: string): void {
  window.localStorage.removeItem(key);
}

function strongholdKey(key: string): string {
  return `${STORAGE_KEY_PREFIX}${key}`;
}

function logStrongholdFallback(operation: string, error: unknown): void {
  console.error(
    `Stronghold auth storage ${operation} failed. Falling back to localStorage.`,
    error,
  );
}

async function canUseStronghold(): Promise<boolean> {
  if (!isTauri()) return false;
  if (strongholdAvailable !== null) return strongholdAvailable;

  try {
    const currentPlatform = platform();
    strongholdAvailable = currentPlatform !== "android" && currentPlatform !== "ios";
  } catch {
    strongholdAvailable = false;
  }

  return strongholdAvailable;
}

async function loadOrCreateClient(stronghold: Stronghold): Promise<Client> {
  try {
    return await stronghold.loadClient(CLIENT_NAME);
  } catch {
    return stronghold.createClient(CLIENT_NAME);
  }
}

async function initializeStrongholdState(): Promise<StrongholdState> {
  const dataDir = await appLocalDataDir();
  const snapshotPath = await join(dataDir, SNAPSHOT_FILE);
  const stronghold = await Stronghold.load(snapshotPath, "app.rheo.finance.supabase-auth.v1");
  const client = await loadOrCreateClient(stronghold);
  return { stronghold, store: client.getStore() };
}

async function getStrongholdState(): Promise<StrongholdState> {
  strongholdStatePromise ??= initializeStrongholdState().catch((error: unknown) => {
    strongholdStatePromise = null;
    throw error;
  });
  return strongholdStatePromise;
}

async function writeStrongholdItem(key: string, value: string): Promise<void> {
  const { stronghold, store } = await getStrongholdState();
  const encoded = Array.from(new TextEncoder().encode(value));
  await store.insert(strongholdKey(key), encoded);
  await stronghold.save();
  localRemoveItem(key);
}

async function removeStrongholdItem(key: string): Promise<void> {
  const { stronghold, store } = await getStrongholdState();
  const existing = await store.get(strongholdKey(key));

  if (existing !== null) {
    await store.remove(strongholdKey(key));
    await stronghold.save();
  }

  localRemoveItem(key);
}

export const secureAuthStorage: AuthStorage = {
  async getItem(key) {
    if (!(await canUseStronghold())) return localGetItem(key);

    try {
      const { store } = await getStrongholdState();
      const value = await store.get(strongholdKey(key));

      if (value !== null) {
        return new TextDecoder().decode(value);
      }

      const legacyValue = localGetItem(key);
      if (legacyValue !== null) {
        try {
          await writeStrongholdItem(key, legacyValue);
        } catch (error) {
          logStrongholdFallback("migration", error);
        }
      }

      return legacyValue;
    } catch (error) {
      logStrongholdFallback("read", error);
      return localGetItem(key);
    }
  },
  async setItem(key, value) {
    if (!(await canUseStronghold())) {
      localSetItem(key, value);
      return;
    }

    try {
      await writeStrongholdItem(key, value);
    } catch (error) {
      logStrongholdFallback("write", error);
      localSetItem(key, value);
    }
  },
  async removeItem(key) {
    if (!(await canUseStronghold())) {
      localRemoveItem(key);
      return;
    }

    try {
      await removeStrongholdItem(key);
    } catch (error) {
      logStrongholdFallback("remove", error);
      localRemoveItem(key);
    }
  },
};
