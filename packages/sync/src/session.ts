export const LEGACY_PENDING_KEY = 'cloudSyncPendingOps';
export const LEGACY_CURSORS_KEY = 'cloudSyncCursors';
export const LEGACY_SETTINGS_TYPES_KEY = 'cloudSyncTypes';
export const LEGACY_ENABLE_KEY = 'enableCloudSync';
export const LEGACY_ENABLE_AUTO_KEY = 'enableAutoCloudSync';
export const LEGACY_LAST_AT_KEY = 'cloudSyncLastAt';
export const LEGACY_LAST_ERROR_KEY = 'cloudSyncLastError';
export const SYNC_DEVICE_KEY = 'cloudSyncDeviceId';

export function syncUserIdOf(user: { _id?: string; uuid?: string; email?: string } | null | undefined): string | undefined {
  const id = user?._id || user?.uuid || user?.email;
  return id ? String(id) : undefined;
}

export function syncSessionKeys(userId: string) {
  return {
    pending: `cloudSync:${userId}:pendingOps`,
    cursors: `cloudSync:${userId}:cursors`,
    settings: `cloudSync:${userId}:settings`,
  };
}

export interface SyncStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export function createMemoryStorage(initial?: Record<string, string>): SyncStorage {
  const map = new Map<string, string>(Object.entries(initial || {}));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

export function migrateLegacySyncKeys(storage: SyncStorage, userId: string) {
  const keys = syncSessionKeys(userId);
  const pending = storage.getItem(LEGACY_PENDING_KEY);
  if (pending && !storage.getItem(keys.pending)) {
    storage.setItem(keys.pending, pending);
    storage.removeItem(LEGACY_PENDING_KEY);
  }
  const cursors = storage.getItem(LEGACY_CURSORS_KEY);
  if (cursors && !storage.getItem(keys.cursors)) {
    storage.setItem(keys.cursors, cursors);
    storage.removeItem(LEGACY_CURSORS_KEY);
  }
  if (!storage.getItem(keys.settings)) {
    const types = storage.getItem(LEGACY_SETTINGS_TYPES_KEY);
    let enable = storage.getItem(LEGACY_ENABLE_KEY);
    if (enable == null)
      enable = storage.getItem(LEGACY_ENABLE_AUTO_KEY);
    const lastAt = storage.getItem(LEGACY_LAST_AT_KEY);
    const lastError = storage.getItem(LEGACY_LAST_ERROR_KEY);
    if (types || enable != null || lastAt || lastError) {
      storage.setItem(keys.settings, JSON.stringify({
        enableCloudSync: enable !== 'false',
        cloudSyncTypes: types ? JSON.parse(types) : undefined,
        lastSyncAt: lastAt ? Number(lastAt) : null,
        lastSyncError: lastError,
      }));
    }
  }
}

export function readJson<T>(storage: SyncStorage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw)
      return fallback;
    return JSON.parse(raw) as T;
  }
  catch {
    return fallback;
  }
}

export function writeJson(storage: SyncStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  }
  catch {
    /* quota */
  }
}

export function getOrCreateDeviceId(
  storage: SyncStorage,
  randomId?: () => string,
): string {
  try {
    let id = storage.getItem(SYNC_DEVICE_KEY);
    if (!id) {
      id = randomId
        ? `dev_${randomId()}`
        : `dev_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      storage.setItem(SYNC_DEVICE_KEY, id);
    }
    return id;
  }
  catch {
    return 'unknown';
  }
}
