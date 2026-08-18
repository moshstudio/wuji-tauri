import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { SyncTypes } from '@/types/sync';
import {
  applyEntityChanges,
  applyPatchConflicts,
} from '@/utils/cloudSyncApply';
import {
  hasPendingOps,
  isAutoSyncSuppressed,
  peekPendingOps,
  pendingHasStructure,
  restorePendingOps,
  setCloudSyncDirtyNotifier,
  setCloudSyncTypeEnabledChecker,
  takePendingOps,
} from './cloudSyncOps';
import { useCloudSyncSettings } from './cloudSyncSettings';
import { useServerStore } from './serverStore';

const STRUCTURE_DEBOUNCE_MS = 2000;
const PROGRESS_DEBOUNCE_MS = 45000;
const BACKOFF_STEPS_MS = [5000, 30000, 120000];

export type CloudSyncStatus = 'idle' | 'syncing' | 'error';
export type CloudSyncReason = 'lifecycle' | 'dirty' | 'manual' | 'retry';

export const useCloudSyncScheduler = defineStore('cloudSyncScheduler', () => {
  let structureTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffTimer: ReturnType<typeof setTimeout> | null = null;
  let inflight = false;
  let manualSyncPaused = false;
  let backoffIndex = 0;
  let lifecycleBound = false;

  const status = ref<CloudSyncStatus>('idle');
  const statusDetail = ref('');

  const settings = () => useCloudSyncSettings();

  const canRunSync = () => {
    const syncSettings = settings();
    const serverStore = useServerStore();
    if (!syncSettings.enableCloudSync)
      return false;
    if (!serverStore.userInfo?.email)
      return false;
    if (!serverStore.hasFeature('cloud_sync'))
      return false;
    if (manualSyncPaused)
      return false;
    return syncSettings.enabledTypes().length > 0;
  };

  const canSchedule = () => canRunSync() && !isAutoSyncSuppressed();

  const clearPushTimers = () => {
    if (structureTimer) {
      clearTimeout(structureTimer);
      structureTimer = null;
    }
    if (progressTimer) {
      clearTimeout(progressTimer);
      progressTimer = null;
    }
  };

  async function pushPending(): Promise<boolean> {
    if (!hasPendingOps())
      return true;
    const syncSettings = settings();
    const ops = takePendingOps().filter(op =>
      syncSettings.isTypeEnabled(op.type),
    );
    if (!ops.length)
      return true;

    const serverStore = useServerStore();
    try {
      const result = await serverStore.syncPatchSilent(ops);
      if (!result?.ok) {
        restorePendingOps(ops);
        return false;
      }
      await applyPatchConflicts(result.conflicts);
      return true;
    }
    catch (error) {
      console.warn('cloud sync push failed', error);
      restorePendingOps(ops);
      return false;
    }
  }

  /** 条目级增量拉取；成功后推进 version 游标 */
  async function pullIncremental(types: SyncTypes[]): Promise<boolean> {
    if (!types.length)
      return true;
    const syncSettings = settings();
    const serverStore = useServerStore();
    const requests = types.map(type => ({
      type,
      since: syncSettings.getCursor(type),
    }));

    const response = await serverStore.syncChangesSilent(requests);
    if (response === false)
      return false;

    await applyEntityChanges(response.results || []);

    for (const group of response.results || []) {
      const type = group.type as SyncTypes;
      if (!Object.values(SyncTypes).includes(type))
        continue;
      if (group.cursor)
        syncSettings.setCursor(type, group.cursor);
    }
    return true;
  }

  /**
   * lifecycle: 增量 pull 已开启类型；有 pending 再 push（无定时）
   * dirty/retry: 无 pending 则 no-op；否则 pull(pendingTypes) → push
   * manual: pull(enabled) → push
   */
  async function syncCycle(
    reason: CloudSyncReason = 'manual',
  ): Promise<boolean> {
    if (inflight)
      return false;
    if (!canRunSync()) {
      if (reason === 'manual') {
        status.value = 'idle';
        statusDetail.value = '同步已关闭或未登录';
      }
      return false;
    }

    const syncSettings = settings();
    const enabled = syncSettings.enabledTypes();
    if (!enabled.length) {
      status.value = 'idle';
      statusDetail.value = '未选择同步类型';
      return true;
    }

    if ((reason === 'dirty' || reason === 'retry') && !hasPendingOps())
      return true;

    const pendingTypes = [
      ...new Set(
        peekPendingOps()
          .filter(op => syncSettings.isTypeEnabled(op.type))
          .map(op => op.type),
      ),
    ];

    let pullTypes: SyncTypes[];
    if (reason === 'lifecycle' || reason === 'manual')
      pullTypes = enabled;
    else
      pullTypes = pendingTypes;

    inflight = true;
    status.value = 'syncing';
    statusDetail.value
      = reason === 'dirty' || reason === 'retry' ? '正在上传…' : '正在同步…';
    clearPushTimers();

    try {
      if (pullTypes.length) {
        const okPull = await pullIncremental(pullTypes);
        if (!okPull) {
          scheduleBackoff(reason === 'lifecycle' ? 'lifecycle' : 'retry');
          status.value = 'error';
          statusDetail.value = '增量同步失败，将自动重试';
          syncSettings.markSyncError(statusDetail.value);
          return false;
        }
      }

      if (hasPendingOps() || reason === 'dirty' || reason === 'retry' || reason === 'manual') {
        const okPush = await pushPending();
        if (!okPush) {
          scheduleBackoff('retry');
          status.value = 'error';
          statusDetail.value = '上传同步失败，将自动重试';
          syncSettings.markSyncError(statusDetail.value);
          return false;
        }
      }

      backoffIndex = 0;
      status.value = 'idle';
      statusDetail.value = '已同步';
      syncSettings.markSyncSuccess();
      return true;
    }
    catch (error) {
      console.warn('cloud sync cycle failed', error);
      scheduleBackoff(reason === 'lifecycle' ? 'lifecycle' : 'retry');
      status.value = 'error';
      statusDetail.value = '同步失败，将自动重试';
      syncSettings.markSyncError(statusDetail.value);
      return false;
    }
    finally {
      inflight = false;
      if (hasPendingOps() && canSchedule())
        scheduleFlush();
    }
  }

  async function flushNow(): Promise<boolean> {
    return syncCycle('dirty');
  }

  function scheduleFlush() {
    if (!hasPendingOps())
      return;
    if (!canSchedule())
      return;

    const delay = pendingHasStructure()
      ? STRUCTURE_DEBOUNCE_MS
      : PROGRESS_DEBOUNCE_MS;

    if (pendingHasStructure()) {
      if (structureTimer)
        clearTimeout(structureTimer);
      structureTimer = setTimeout(() => {
        structureTimer = null;
        void syncCycle('dirty');
      }, delay);
    }
    else {
      if (progressTimer)
        return;
      progressTimer = setTimeout(() => {
        progressTimer = null;
        void syncCycle('dirty');
      }, delay);
    }
  }

  function scheduleBackoff(next: CloudSyncReason = 'retry') {
    if (backoffTimer)
      clearTimeout(backoffTimer);
    const ms = BACKOFF_STEPS_MS[Math.min(backoffIndex, BACKOFF_STEPS_MS.length - 1)];
    backoffIndex += 1;
    backoffTimer = setTimeout(() => {
      backoffTimer = null;
      if (next === 'lifecycle' || hasPendingOps())
        void syncCycle(next === 'lifecycle' ? 'lifecycle' : 'retry');
    }, ms);
  }

  const pauseForManualSync = () => {
    manualSyncPaused = true;
    clearPushTimers();
  };

  const resumeAfterManualSync = () => {
    manualSyncPaused = false;
    if (hasPendingOps())
      scheduleFlush();
  };

  const bindLifecycle = () => {
    if (lifecycleBound || typeof window === 'undefined')
      return;
    lifecycleBound = true;

    const flushIfPending = () => {
      if (hasPendingOps() && canRunSync())
        void syncCycle('dirty');
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushIfPending();
      }
      else if (document.visibilityState === 'visible') {
        if (canRunSync())
          void syncCycle('lifecycle');
      }
    });
    window.addEventListener('pagehide', flushIfPending);
    window.addEventListener('beforeunload', flushIfPending);
  };

  /** 登录/启动：增量 pull（可无 pending）；有 pending 再 push */
  const checkAndFlush = () => {
    if (!canRunSync())
      return;
    void syncCycle('lifecycle');
  };

  const syncNow = async () => syncCycle('manual');

  setCloudSyncDirtyNotifier(() => {
    try {
      scheduleFlush();
    }
    catch {
      /* pinia 未就绪 */
    }
  });

  setCloudSyncTypeEnabledChecker((type) => {
    try {
      return settings().isTypeEnabled(type);
    }
    catch {
      return true;
    }
  });

  const lastSyncAt = computed(() => settings().lastSyncAt);
  const lastSyncError = computed(() => settings().lastSyncError);

  return {
    status,
    statusDetail,
    lastSyncAt,
    lastSyncError,
    notifyDirty: scheduleFlush,
    flushNow,
    scheduleFlush,
    syncCycle,
    syncNow,
    pauseForManualSync,
    resumeAfterManualSync,
    bindLifecycle,
    checkAndFlush,
  };
});
