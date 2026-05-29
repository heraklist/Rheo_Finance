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
const SNAPSHOT_FILE = "supabase-auth-v2.stronghold";
const STORAGE_KEY_PREFIX = "supabase:";
const STRONGHOLD_PASSPHRASE_KEY = "rheo:stronghold-passphrase:v1";
const NATIVE_SECURE_STORAGE_COMMANDS = [
  "secure_auth_storage",
  "plugin:secure_auth_storage",
  "plugin:secure-auth-storage",
] as const;
const LEGACY_SHARED_AUTH_STORAGE_KEYS = ["updater:github-token"];

let strongholdStatePromise: Promise<StrongholdState> | null = null;
let tauriPlatformPromise: Promise<string | null> | null = null;

interface NativeSecureStorageValue {
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

function logNativeSecureStorageFailure(operation: string, error: unknown): void {
  console.error(`Native secure auth storage ${operation} failed.`, error);
}

async function removeLegacyStrongholdPassphrase(): Promise<void> {
  if (!localGetItem(STRONGHOLD_PASSPHRASE_KEY)) return;

  localRemoveItem(STRONGHOLD_PASSPHRASE_KEY);
}

async function migrateKnownLegacyStrongholdItems(keys: string[]): Promise<void> {
  if (!localGetItem(STRONGHOLD_PASSPHRASE_KEY)) return;

  for (const key of new Set(keys)) {
    const existingNativeValue = await readNativeSecureItem(key);
    if (existingNativeValue !== null) {
      await removeStrongholdItem(key);
      continue;
    }

    const legacyValue = await readStrongholdItem(key);
    if (legacyValue === null) continue;

    await writeNativeSecureItem(key, legacyValue);
    await removeStrongholdItem(key);
  }

  await removeLegacyStrongholdPassphrase();
}

async function getTauriPlatform(): Promise<string | null> {
  if (!isTauri()) return null;

  tauriPlatformPromise ??= Promise.resolve()
    .then(() => platform())
    .catch(() => null);

  return tauriPlatformPromise;
}

async function canUseNativeSecureStorage(): Promise<boolean> {
  const currentPlatform = await getTauriPlatform();
  return currentPlatform === "android" || currentPlatform === "windows";
}

async function loadOrCreateClient(stronghold: Stronghold): Promise<Client> {
  try {
    return await stronghold.loadClient(CLIENT_NAME);
  } catch {
    return stronghold.createClient(CLIENT_NAME);
  }
}

async function initializeStrongholdState(
  snapshotFile: string,
  passphrase: string,
): Promise<StrongholdState> {
  const dataDir = await appLocalDataDir();
  const snapshotPath = await join(dataDir, snapshotFile);
  const stronghold = await Stronghold.load(snapshotPath, passphrase);
  const client = await loadOrCreateClient(stronghold);
  return { stronghold, store: client.getStore() };
}

async function getLegacyStrongholdState(): Promise<StrongholdState | null> {
  const passphrase = localGetItem(STRONGHOLD_PASSPHRASE_KEY);
  if (!passphrase) return null;

  strongholdStatePromise ??= initializeStrongholdState(SNAPSHOT_FILE, passphrase).catch(
    (error: unknown) => {
      strongholdStatePromise = null;
      throw error;
    },
  );
  return strongholdStatePromise;
}

async function readStrongholdItem(key: string): Promise<string | null> {
  const state = await getLegacyStrongholdState();
  if (!state) return null;

  const { store } = state;
  const value = await store.get(strongholdKey(key));
  return value === null ? null : new TextDecoder().decode(value);
}

async function removeStrongholdItem(key: string): Promise<void> {
  const state = await getLegacyStrongholdState();
  if (!state) return;

  const { stronghold, store } = state;
  const existing = await store.get(strongholdKey(key));

  if (existing !== null) {
    await store.remove(strongholdKey(key));
    await stronghold.save();
  }

  localRemoveItem(key);
}

async function readNativeSecureItem(key: string): Promise<string | null> {
  const result = await invokeNativeSecureStorage<NativeSecureStorageValue>("get_item", { key });

  return result.value ?? null;
}

async function writeNativeSecureItem(key: string, value: string): Promise<void> {
  await invokeNativeSecureStorage("set_item", { key, value });
  localRemoveItem(key);
}

async function removeNativeSecureItem(key: string): Promise<void> {
  await invokeNativeSecureStorage("remove_item", { key });
  localRemoveItem(key);
}

async function invokeNativeSecureStorage<T = void>(
  command: "get_item" | "set_item" | "remove_item",
  args: Record<string, string>,
): Promise<T> {
  let lastError: unknown;

  for (const prefix of NATIVE_SECURE_STORAGE_COMMANDS) {
    try {
      const commandName =
        prefix === "secure_auth_storage" ? `${prefix}_${command}` : `${prefix}|${command}`;
      return await invoke<T>(commandName, args);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export const secureAuthStorage: AuthStorage = {
  async getItem(key) {
    if (await canUseNativeSecureStorage()) {
      try {
        const value = await readNativeSecureItem(key);
        if (value !== null) {
          localRemoveItem(key);
          await migrateKnownLegacyStrongholdItems([...LEGACY_SHARED_AUTH_STORAGE_KEYS, key]);
          return value;
        }

        const legacyValue = localGetItem(key);
        if (legacyValue !== null) {
          try {
            await writeNativeSecureItem(key, legacyValue);
            try {
              await migrateKnownLegacyStrongholdItems([...LEGACY_SHARED_AUTH_STORAGE_KEYS, key]);
            } catch (error) {
              logNativeSecureStorageFailure("legacy Stronghold cleanup", error);
            }
          } catch (error) {
            logNativeSecureStorageFailure("local migration", error);
          }
          return legacyValue;
        }

        if (localGetItem(STRONGHOLD_PASSPHRASE_KEY)) {
          try {
            const strongholdValue = await readStrongholdItem(key);
            if (strongholdValue !== null) {
              try {
                await writeNativeSecureItem(key, strongholdValue);
                await migrateKnownLegacyStrongholdItems([...LEGACY_SHARED_AUTH_STORAGE_KEYS, key]);
              } catch (error) {
                logNativeSecureStorageFailure("Stronghold migration", error);
              }
              return strongholdValue;
            }
          } catch (error) {
            logNativeSecureStorageFailure("Stronghold read", error);
          }
        }
      } catch (error) {
        logNativeSecureStorageFailure("read", error);
      }
    }

    return localGetItem(key);
  },
  async setItem(key, value) {
    if (await canUseNativeSecureStorage()) {
      try {
        await writeNativeSecureItem(key, value);
        return;
      } catch (error) {
        logNativeSecureStorageFailure("write", error);
      }
    }

    localSetItem(key, value);
  },
  async removeItem(key) {
    if (await canUseNativeSecureStorage()) {
      try {
        await removeNativeSecureItem(key);
      } catch (error) {
        logNativeSecureStorageFailure("remove", error);
      }
    }

    localRemoveItem(key);
  },
};
