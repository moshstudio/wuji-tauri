import type { SyncTypes } from '@wuji-tauri/sync';
import {
  ALL_SYNC_TYPES,
  defaultCloudSyncTypes,
  migrateLegacySyncKeys,
  readJson,
  syncSessionKeys,
  writeJson,
} from '@wuji-tauri/sync';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const browserStorage = {
  getItem(key: string) {
    try {
      if (typeof localStorage === 'undefined')
        return null;
      return localStorage.getItem(key);
    }
    catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      if (typeof localStorage === 'undefined')
        return;
      localStorage.setItem(key, value);
    }
    catch {
      /* quota */
    }
  },
  removeItem(key: string) {
    try {
      if (typeof localStorage === 'undefined')
        return;
      localStorage.removeItem(key);
    }
    catch {
      /* ignore */
    }
  },
};

interface PersistedSettings {
  enableCloudSync?: boolean;
  cloudSyncTypes?: Record<SyncTypes, boolean>;
  lastSyncAt?: number | null;
  lastSyncError?: string | null;
}

export const useCloudSyncSettings = defineStore('cloudSyncSettings', () => {
  let boundUserId: string | undefined;
  const enableCloudSync = ref(true);
  const cloudSyncTypes = ref(defaultCloudSyncTypes());
  const cloudSyncCursors = ref<Partial<Record<SyncTypes, string>>>({});
  const lastSyncAt = ref<number | null>(null);
  const lastSyncError = ref<string | null>(null);

  const persist = () => {
    if (!boundUserId)
      return;
    const keys = syncSessionKeys(boundUserId);
    writeJson(browserStorage, keys.settings, {
      enableCloudSync: enableCloudSync.value,
      cloudSyncTypes: cloudSyncTypes.value,
      lastSyncAt: lastSyncAt.value,
      lastSyncError: lastSyncError.value,
    } satisfies PersistedSettings);
    writeJson(browserStorage, keys.cursors, cloudSyncCursors.value);
  };

  const resetInMemory = () => {
    enableCloudSync.value = true;
    cloudSyncTypes.value = defaultCloudSyncTypes();
    cloudSyncCursors.value = {};
    lastSyncAt.value = null;
    lastSyncError.value = null;
  };

  const loadUser = (userId: string) => {
    migrateLegacySyncKeys(browserStorage, userId);
    const keys = syncSessionKeys(userId);
    const settings = readJson<PersistedSettings>(browserStorage, keys.settings, {});
    enableCloudSync.value = settings.enableCloudSync !== false;
    cloudSyncTypes.value = {
      ...defaultCloudSyncTypes(),
      ...(settings.cloudSyncTypes || {}),
    };
    lastSyncAt.value = settings.lastSyncAt ?? null;
    lastSyncError.value = settings.lastSyncError ?? null;
    cloudSyncCursors.value = readJson(browserStorage, keys.cursors, {});
  };

  const bindUser = (userId?: string) => {
    if (userId === boundUserId)
      return;
    persist();
    boundUserId = userId;
    if (!userId) {
      resetInMemory();
      return;
    }
    loadUser(userId);
  };

  watch(
    [enableCloudSync, cloudSyncTypes, cloudSyncCursors, lastSyncAt, lastSyncError],
    () => persist(),
    { deep: true },
  );

  const isTypeEnabled = (type: SyncTypes) => {
    if (!enableCloudSync.value)
      return false;
    const map = cloudSyncTypes.value;
    if (!map || map[type] === undefined)
      return true;
    return !!map[type];
  };

  const enabledTypes = (): SyncTypes[] =>
    ALL_SYNC_TYPES.filter(t => isTypeEnabled(t));

  const setTypeEnabled = (type: SyncTypes, enabled: boolean) => {
    cloudSyncTypes.value = {
      ...defaultCloudSyncTypes(),
      ...cloudSyncTypes.value,
      [type]: enabled,
    };
  };

  const setAllTypes = (enabled: boolean) => {
    cloudSyncTypes.value = Object.fromEntries(
      ALL_SYNC_TYPES.map(t => [t, enabled]),
    ) as Record<SyncTypes, boolean>;
  };

  const getCursor = (type: SyncTypes) => {
    const raw = cloudSyncCursors.value[type];
    if (!raw)
      return undefined;
    if (/^\d+$/.test(raw))
      return raw;
    return undefined;
  };

  const setCursor = (type: SyncTypes, versionCursor: string) => {
    if (!/^\d+$/.test(versionCursor))
      return;
    cloudSyncCursors.value = {
      ...cloudSyncCursors.value,
      [type]: versionCursor,
    };
  };

  const markSyncSuccess = () => {
    lastSyncAt.value = Date.now();
    lastSyncError.value = null;
  };

  const markSyncError = (message: string) => {
    lastSyncError.value = message;
  };

  const invalidateCursors = (types?: SyncTypes[]) => {
    const targets = types?.length ? types : ALL_SYNC_TYPES;
    const next = { ...cloudSyncCursors.value };
    for (const type of targets)
      delete next[type];
    cloudSyncCursors.value = next;
  };

  return {
    enableCloudSync,
    cloudSyncTypes,
    cloudSyncCursors,
    lastSyncAt,
    lastSyncError,
    bindUser,
    isTypeEnabled,
    enabledTypes,
    setTypeEnabled,
    setAllTypes,
    getCursor,
    setCursor,
    invalidateCursors,
    markSyncSuccess,
    markSyncError,
  };
});
