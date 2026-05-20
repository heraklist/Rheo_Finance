import { invoke, isTauri } from "@tauri-apps/api/core";
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
const ANDROID_SECURE_STORAGE_COMMAND = "plugin:secure_auth_storage";

let strongholdStatePromise: Promise<StrongholdState> | null = null;
let strongholdAvailable: boolean | null = null;
let tauriPlatformPromise: Promise<string | null> | null = null;

interface AndroidSecureStorageValue {
  value?: string | null;
}

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

function logStrongholdFailure(operation: string, error: unknown): void {
  console.error(`Stronghold auth storage ${operation} failed.`, error);
}

function logAndroidSecureStorageFailure(operation: string, error: unknown): void {
  console.error(`Android secure auth storage ${operation} failed.`, error);
}

async function getTauriPlatform(): Promise<string | null> {
  if (!isTauri()) return null;

  tauriPlatformPromise ??= Promise.resolve()
    .then(() => platform())
    .catch(() => null);

  return tauriPlatformPromise;
}

async function canUseAndroidSecureStorage(): Promise<boolean> {
  return (await getTauriPlatform()) === "android";
}

async function canUseStronghold(): Promise<boolean> {
  if (!isTauri()) return false;
  if (strongholdAvailable !== null) return strongholdAvailable;

  const currentPlatform = await getTauriPlatform();
  strongholdAvailable =
    currentPlatform !== null && currentPlatform !== "android" && currentPlatform !== "ios";

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

async function readAndroidSecureItem(key: string): Promise<string | null> {
  const result = await invoke<AndroidSecureStorageValue>(
    `${ANDROID_SECURE_STORAGE_COMMAND}|get_item`,
    { key },
  );

  return result.value ?? null;
}

async function writeAndroidSecureItem(key: string, value: string): Promise<void> {
  await invoke(`${ANDROID_SECURE_STORAGE_COMMAND}|set_item`, { key, value });
  localRemoveItem(key);
}

async function removeAndroidSecureItem(key: string): Promise<void> {
  await invoke(`${ANDROID_SECURE_STORAGE_COMMAND}|remove_item`, { key });
  localRemoveItem(key);
}

export const secureAuthStorage: AuthStorage = {
  async getItem(key) {
    if (await canUseAndroidSecureStorage()) {
      try {
        const value = await readAndroidSecureItem(key);
        if (value !== null) return value;

        const legacyValue = localGetItem(key);
        if (legacyValue !== null) {
          try {
            await writeAndroidSecureItem(key, legacyValue);
            return legacyValue;
          } catch (error) {
            logAndroidSecureStorageFailure("migration", error);
            return null;
          }
        }

        return null;
      } catch (error) {
        logAndroidSecureStorageFailure("read", error);
        return null;
      }
    }

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
          logStrongholdFailure("migration", error);
        }
      }

      return legacyValue;
    } catch (error) {
      logStrongholdFailure("read", error);
      return null;
    }
  },
  async setItem(key, value) {
    if (await canUseAndroidSecureStorage()) {
      try {
        await writeAndroidSecureItem(key, value);
      } catch (error) {
        logAndroidSecureStorageFailure("write", error);
        throw error;
      }
      return;
    }

    if (!(await canUseStronghold())) {
      localSetItem(key, value);
      return;
    }

    try {
      await writeStrongholdItem(key, value);
    } catch (error) {
      logStrongholdFailure("write", error);
      throw error;
    }
  },
  async removeItem(key) {
    if (await canUseAndroidSecureStorage()) {
      try {
        await removeAndroidSecureItem(key);
      } catch (error) {
        logAndroidSecureStorageFailure("remove", error);
        localRemoveItem(key);
      }
      return;
    }

    if (!(await canUseStronghold())) {
      localRemoveItem(key);
      return;
    }

    try {
      await removeStrongholdItem(key);
    } catch (error) {
      logStrongholdFailure("remove", error);
      localRemoveItem(key);
    }
  },
};
