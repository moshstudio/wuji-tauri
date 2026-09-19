import type { CloudSyncOp, CloudSyncPhase, CloudSyncReason } from '@wuji-tauri/sync';
import {
  backoffMs,
  canUseCloudSync,
  debounceDelayMs,
  mapPhaseToStatus,
  resolvePullTypes,
  shouldSkipDirtyCycle,
  statusDetailForPhase,
  SyncTypes,
} from '@wuji-tauri/sync';
import { nanoid } from 'nanoid';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  applyEntityChanges,
  applyPatchConflicts,
  isSyncTypeReady,
} from '@/utils/cloudSyncApply';
import { useBookShelfStore } from './bookShelfStore';
import {
  ackMutationIds,
  enqueueOp,
  hasPendingOps,
  peekPendingOps,
  pendingHasStructure,
  runApplyingRemote,
  setCloudSyncDirtyNotifier,
  setCloudSyncTypeEnabledChecker,
  snapshotPendingOps,
} from './cloudSyncOps';
import { useCloudSyncSettings } from './cloudSyncSettings';
import { useComicShelfStore } from './comicShelfStore';
import { usePhotoShelfStore } from './photoShelfStore';
import { useServerStore } from './serverStore';
import { useSongShelfStore } from './songShelfStore';
import { useSubscribeSourceStore } from './subscribeSourceStore';
import { useVideoShelfStore } from './videoShelfStore';

export type { CloudSyncPhase, CloudSyncReason };
export type CloudSyncStatus = 'idle' | 'syncing' | 'error';

export const useCloudSyncScheduler = defineStore('cloudSyncScheduler', () => {
  let structureTimer: ReturnType<typeof setTimeout> | null = null;
  let progressTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffTimer: ReturnType<typeof setTimeout> | null = null;
  let inflight = false;
  let dirtyWhileInflight = false;
  let backoffIndex = 0;
  let lifecycleBound = false;
  let sessionGen = 0;

  const phase = ref<CloudSyncPhase>('Disabled');
  const statusDetail = ref('');

  const settings = () => useCloudSyncSettings();
  let storesReady = false;

  async function waitForLocalStores(timeoutMs = 8000) {
    if (storesReady)
      return;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const loaded = [
        useBookShelfStore().storage?.loaded,
        useComicShelfStore().storage?.loaded,
        useVideoShelfStore().storage?.loaded,
        usePhotoShelfStore().storage?.loaded,
        useSongShelfStore().storage?.loaded,
        useSubscribeSourceStore().storage?.loaded,
      ].every(Boolean);
      if (loaded) {
        storesReady = true;
        return;
      }
      await new Promise(r => setTimeout(r, 50));
    }
  }

  const permissionOpen = () => {
    const serverStore = useServerStore();
    return canUseCloudSync({
      loggedIn: !!serverStore.userInfo?.email,
      hasCloudSyncFeature: serverStore.hasFeature('cloud_sync'),
    });
  };

  const gatesOpen = () => {
    const syncSettings = settings();
    if (phase.value === 'PausedManual')
      return false;
    if (!permissionOpen())
      return false;
    if (!syncSettings.enableCloudSync)
      return false;
    return syncSettings.enabledTypes().length > 0;
  };

  const canSchedule = () => gatesOpen();

  const setPhase = (next: CloudSyncPhase, reason?: CloudSyncReason) => {
    phase.value = next;
    const detail = statusDetailForPhase(next, reason);
    if (detail)
      statusDetail.value = detail;
  };

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

  function pendingTypesOf(): SyncTypes[] {
    const syncSettings = settings();
    return [...new Set(
      peekPendingOps()
        .filter(op => syncSettings.isTypeEnabled(op.type))
        .map(op => op.type),
    )];
  }

  async function pushPending(): Promise<boolean> {
    const syncSettings = settings();
    const ops = snapshotPendingOps().filter(op =>
      syncSettings.isTypeEnabled(op.type),
    );
    if (!ops.length)
      return true;

    const serverStore = useServerStore();
    const gen = sessionGen;
    try {
      const result = await serverStore.syncPatchSilent(ops);
      if (gen !== sessionGen)
        return false;
      if (!result?.ok)
        return false;

      await runApplyingRemote(() => applyPatchConflicts(result.conflicts));

      const conflictKeys = new Set(
        (result.conflicts || []).map(
          c => `${c.type}|${c.op}|${c.entityId}|${c.parentId || ''}`,
        ),
      );
      const conflictMutations = new Set(
        (result.conflicts || [])
          .map(c => (c as { mutationId?: string }).mutationId)
          .filter((id): id is string => !!id),
      );

      let appliedIds: string[];
      if (result.appliedMutationIds?.length) {
        appliedIds = result.appliedMutationIds;
      }
      else {
        appliedIds = ops
          .filter((op) => {
            if (op.clientMutationId && conflictMutations.has(op.clientMutationId))
              return false;
            return !conflictKeys.has(
              `${op.type}|${op.op}|${op.entityId}|${op.parentId || ''}`,
            );
          })
          .map(op => op.clientMutationId)
          .filter((id): id is string => !!id);
      }

      ackMutationIds(appliedIds);

      if (result.conflicts?.length) {
        const retry: CloudSyncOp[] = [];
        for (const op of ops) {
          if (op.op !== 'upsertSubscribe')
            continue;
          const conflict = result.conflicts.find(
            c => c.op === op.op && c.entityId === op.entityId,
          );
          if (!conflict)
            continue;
          const localFlags = Number(
            (op.payload as any)?._sync?.flagsUpdatedAt
            || (op.payload as any)?.flagsUpdatedAt
            || 0,
          );
          const serverFlags = Number(
            (conflict.payload as any)?._sync?.flagsUpdatedAt
            || (conflict.payload as any)?.flagsUpdatedAt
            || 0,
          );
          if (localFlags >= serverFlags) {
            retry.push({
              ...op,
              clientUpdatedAt: Date.now(),
              clientMutationId: nanoid(),
            });
          }
        }
        ackMutationIds(
          ops
            .filter(op =>
              conflictMutations.has(op.clientMutationId || '')
              || conflictKeys.has(
                `${op.type}|${op.op}|${op.entityId}|${op.parentId || ''}`,
              ),
            )
            .map(op => op.clientMutationId),
        );
        for (const op of retry)
          enqueueOp(op);
      }
      return true;
    }
    catch (error) {
      console.warn('cloud sync push failed', error);
      return false;
    }
  }

  async function pullIncremental(types: SyncTypes[]): Promise<boolean> {
    if (!types.length)
      return true;
    const syncSettings = settings();
    const serverStore = useServerStore();
    const requests = types.map(type => ({
      type,
      since: syncSettings.getCursor(type),
    }));

    const gen = sessionGen;
    const response = await serverStore.syncChangesSilent(requests);
    if (gen !== sessionGen)
      return false;
    if (response === false)
      return false;

    await runApplyingRemote(() => applyEntityChanges(response.results || []));

    for (const group of response.results || []) {
      const type = group.type as SyncTypes;
      if (!Object.values(SyncTypes).includes(type))
        continue;
      if (group.changes?.length && !isSyncTypeReady(type))
        continue;
      if (group.cursor)
        syncSettings.setCursor(type, group.cursor);
    }
    return true;
  }

  /**
   * lifecycle/manual: pull(enabled) → merge → push
   * dirty/retry: 无 pending 则 no-op；否则 pull(pendingTypes) → merge → push
   */
  async function syncCycle(
    reason: CloudSyncReason = 'manual',
  ): Promise<boolean> {
    if (inflight) {
      dirtyWhileInflight = true;
      return false;
    }
    inflight = true;
    dirtyWhileInflight = false;
    try {
      await waitForLocalStores();
      if (!gatesOpen()) {
        if (phase.value !== 'PausedManual')
          setPhase('Disabled', reason);
        if (reason === 'manual')
          statusDetail.value = '同步已关闭或未登录';
        return false;
      }

      const syncSettings = settings();
      const enabled = syncSettings.enabledTypes();
      if (!enabled.length) {
        setPhase('Idle');
        statusDetail.value = '未选择同步类型';
        return true;
      }

      if (shouldSkipDirtyCycle(reason, hasPendingOps())) {
        setPhase('Idle');
        return true;
      }

      const pullTypes = resolvePullTypes(reason, enabled, pendingTypesOf());

      setPhase('Pulling', reason);
      clearPushTimers();

      if (pullTypes.length) {
        const okPull = await pullIncremental(pullTypes);
        if (!okPull) {
          scheduleBackoff(reason === 'lifecycle' ? 'lifecycle' : 'retry');
          setPhase('Backoff');
          statusDetail.value = '增量同步失败，将自动重试';
          syncSettings.markSyncError(statusDetail.value);
          return false;
        }
      }

      setPhase('Merging', reason);

      const snapshot = snapshotPendingOps().filter(op =>
        syncSettings.isTypeEnabled(op.type),
      );
      if (snapshot.length || reason === 'dirty' || reason === 'retry' || reason === 'manual') {
        if (snapshot.length) {
          setPhase('Pushing', reason);
          const okPush = await pushPending();
          if (!okPush) {
            scheduleBackoff('retry');
            setPhase('Backoff');
            statusDetail.value = '上传同步失败，将自动重试';
            syncSettings.markSyncError(statusDetail.value);
            return false;
          }
        }
      }

      backoffIndex = 0;
      setPhase('Idle');
      statusDetail.value = '已同步';
      syncSettings.markSyncSuccess();
      return true;
    }
    catch (error) {
      console.warn('cloud sync cycle failed', error);
      scheduleBackoff(reason === 'lifecycle' ? 'lifecycle' : 'retry');
      setPhase('Backoff');
      statusDetail.value = '同步失败，将自动重试';
      settings().markSyncError(statusDetail.value);
      return false;
    }
    finally {
      inflight = false;
      if ((dirtyWhileInflight || hasPendingOps()) && canSchedule())
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
    if (inflight) {
      dirtyWhileInflight = true;
      return;
    }

    const hasStructure = pendingHasStructure();
    const delay = debounceDelayMs(hasStructure);

    if (hasStructure) {
      setPhase('DebounceStruct');
      if (structureTimer)
        clearTimeout(structureTimer);
      structureTimer = setTimeout(() => {
        structureTimer = null;
        void syncCycle('dirty');
      }, delay);
    }
    else {
      if (phase.value === 'Idle')
        setPhase('DebounceProgress');
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
    const ms = backoffMs(backoffIndex);
    backoffIndex += 1;
    setPhase('Backoff');
    backoffTimer = setTimeout(() => {
      backoffTimer = null;
      if (next === 'lifecycle' || hasPendingOps())
        void syncCycle(next === 'lifecycle' ? 'lifecycle' : 'retry');
    }, ms);
  }

  const pauseForManualSync = () => {
    phase.value = 'PausedManual';
    clearPushTimers();
    if (backoffTimer) {
      clearTimeout(backoffTimer);
      backoffTimer = null;
    }
  };

  const resumeAfterManualSync = (types?: SyncTypes[]) => {
    if (types?.length)
      settings().invalidateCursors(types);
    if (phase.value === 'PausedManual')
      phase.value = gatesOpen() ? 'Idle' : 'Disabled';
    if (gatesOpen())
      void syncCycle('lifecycle');
    else if (hasPendingOps())
      scheduleFlush();
  };

  const bindLifecycle = () => {
    if (lifecycleBound || typeof window === 'undefined')
      return;
    lifecycleBound = true;

    const flushIfPending = () => {
      if (hasPendingOps() && gatesOpen())
        void syncCycle('dirty');
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushIfPending();
      }
      else if (document.visibilityState === 'visible') {
        if (gatesOpen())
          void syncCycle('lifecycle');
      }
    });
    window.addEventListener('pagehide', flushIfPending);
    window.addEventListener('beforeunload', flushIfPending);
  };

  const checkAndFlush = () => {
    if (!gatesOpen()) {
      if (phase.value !== 'PausedManual')
        setPhase('Disabled');
      return;
    }
    void syncCycle('lifecycle');
  };

  const onSessionChanged = () => {
    sessionGen += 1;
    inflight = false;
    dirtyWhileInflight = false;
    backoffIndex = 0;
    clearPushTimers();
    if (backoffTimer) {
      clearTimeout(backoffTimer);
      backoffTimer = null;
    }
    if (phase.value !== 'PausedManual')
      setPhase(gatesOpen() ? 'Idle' : 'Disabled');
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

  const status = computed(() => mapPhaseToStatus(phase.value));
  const lastSyncAt = computed(() => settings().lastSyncAt);
  const lastSyncError = computed(() => settings().lastSyncError);
  const canUseSync = computed(() => permissionOpen());

  return {
    phase,
    status,
    statusDetail,
    lastSyncAt,
    lastSyncError,
    canUseSync,
    notifyDirty: scheduleFlush,
    flushNow,
    scheduleFlush,
    syncCycle,
    syncNow,
    pauseForManualSync,
    resumeAfterManualSync,
    bindLifecycle,
    checkAndFlush,
    onSessionChanged,
  };
});
