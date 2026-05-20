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
const NATIVE_SECURE_STORAGE_COMMAND = "plugin:secure_auth_storage";

let strongholdStatePromise: Promise<StrongholdState> | null = null;
let strongholdAvailable: boolean | null = null;
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

function createStrongholdPassphrase(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function getStrongholdPassphrase(): string {
  const existing = localGetItem(STRONGHOLD_PASSPHRASE_KEY);
  if (existing) return existing;

  const passphrase = createStrongholdPassphrase();
  localSetItem(STRONGHOLD_PASSPHRASE_KEY, passphrase);
  return passphrase;
}

function logStrongholdFailure(operation: string, error: unknown): void {
  console.error(`Stronghold auth storage ${operation} failed.`, error);
}

function logNativeSecureStorageFailure(operation: string, error: unknown): void {
  console.error(`Native secure auth storage ${operation} failed.`, error);
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

async function getStrongholdState(): Promise<StrongholdState> {
  strongholdStatePromise ??= initializeStrongholdState(
    SNAPSHOT_FILE,
    getStrongholdPassphrase(),
  ).catch((error: unknown) => {
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

async function readStrongholdItem(key: string): Promise<string | null> {
  const { store } = await getStrongholdState();
  const value = await store.get(strongholdKey(key));
  return value === null ? null : new TextDecoder().decode(value);
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

async function readNativeSecureItem(key: string): Promise<string | null> {
  const result = await invoke<NativeSecureStorageValue>(
    `${NATIVE_SECURE_STORAGE_COMMAND}|get_item`,
    { key },
  );

  return result.value ?? null;
}

async function writeNativeSecureItem(key: string, value: string): Promise<void> {
  await invoke(`${NATIVE_SECURE_STORAGE_COMMAND}|set_item`, { key, value });
  localRemoveItem(key);
}

async function removeNativeSecureItem(key: string): Promise<void> {
  await invoke(`${NATIVE_SECURE_STORAGE_COMMAND}|remove_item`, { key });
  localRemoveItem(key);
}

export const secureAuthStorage: AuthStorage = {
  async getItem(key) {
    if (await canUseNativeSecureStorage()) {
      try {
        const value = await readNativeSecureItem(key);
        if (value !== null) return value;

        const legacyValue = localGetItem(key);
        if (legacyValue !== null) {
          try {
            await writeNativeSecureItem(key, legacyValue);
            return legacyValue;
          } catch (error) {
            logNativeSecureStorageFailure("local migration", error);
            return null;
          }
        }

        if (localGetItem(STRONGHOLD_PASSPHRASE_KEY)) {
          try {
            const strongholdValue = await readStrongholdItem(key);
            if (strongholdValue !== null) {
              try {
                await writeNativeSecureItem(key, strongholdValue);
                await removeStrongholdItem(key);
                localRemoveItem(STRONGHOLD_PASSPHRASE_KEY);
              } catch (error) {
                logNativeSecureStorageFailure("Stronghold migration", error);
              }
              return strongholdValue;
            }
          } catch (error) {
            logNativeSecureStorageFailure("Stronghold read", error);
          }
        }

        return null;
      } catch (error) {
        logNativeSecureStorageFailure("read", error);
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
        return legacyValue;
      }

      return null;
    } catch (error) {
      logStrongholdFailure("read", error);
      return null;
    }
  },
  async setItem(key, value) {
    if (await canUseNativeSecureStorage()) {
      try {
        await writeNativeSecureItem(key, value);
      } catch (error) {
        logNativeSecureStorageFailure("write", error);
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
    if (await canUseNativeSecureStorage()) {
      try {
        await removeNativeSecureItem(key);
      } catch (error) {
        logNativeSecureStorageFailure("remove", error);
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
