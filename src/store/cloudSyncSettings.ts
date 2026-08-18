import { useStorageAsync } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ALL_SYNC_TYPES, SyncTypes } from '@/types/sync';

function defaultCloudSyncTypes(): Record<SyncTypes, boolean> {
  return Object.fromEntries(
    ALL_SYNC_TYPES.map(t => [t, true]),
  ) as Record<SyncTypes, boolean>;
}

export const useCloudSyncSettings = defineStore('cloudSyncSettings', () => {
  /** 总开关：开启后自动双向同步（兼容旧键 enableAutoCloudSync） */
  const enableCloudSync = useStorageAsync('enableCloudSync', (() => {
    try {
      const legacy = localStorage.getItem('enableAutoCloudSync');
      if (legacy === 'false')
        return false;
    }
    catch {
      /* ignore */
    }
    return true;
  })());

  const cloudSyncTypes = useStorageAsync<Record<SyncTypes, boolean>>(
    'cloudSyncTypes',
    defaultCloudSyncTypes(),
  );

  /** 各类型上次成功同步游标（服务端 version 十进制字符串） */
  const cloudSyncCursors = useStorageAsync<Partial<Record<SyncTypes, string>>>(
    'cloudSyncCursors',
    {},
  );

  const lastSyncAt = useStorageAsync<number | null>('cloudSyncLastAt', null);
  const lastSyncError = useStorageAsync<string | null>('cloudSyncLastError', null);

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

  /** 仅返回数字 version；旧 ISO 游标视为未同步 */
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

  return {
    enableCloudSync,
    cloudSyncTypes,
    cloudSyncCursors,
    lastSyncAt,
    lastSyncError,
    isTypeEnabled,
    enabledTypes,
    setTypeEnabled,
    setAllTypes,
    getCursor,
    setCursor,
    markSyncSuccess,
    markSyncError,
  };
});
