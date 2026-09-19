import type { SyncStorage } from './session';
import type { CloudSyncOp, SyncOpName, SyncTypes } from './types';
import { entityTsKey, nextLogicalTime, resetEntityTs } from './clock';
import {
  migrateLegacySyncKeys,
  readJson,
  syncSessionKeys,
} from './session';
import { mergeSubscribeSyncPayload } from './subscribeMerge';
import { isStructureOp, syncOpKey } from './types';

export interface PendingQueueDeps {
  storage: SyncStorage;
  now?: () => number;
  randomId: () => string;
  getDeviceId: () => string;
  userId?: () => string | undefined;
  canEnqueue?: () => boolean;
  isTypeEnabled?: (type: SyncTypes) => boolean;
  onDirty?: () => void;
}

export function createPendingQueue(deps: PendingQueueDeps) {
  const pendingOps = new Map<string, CloudSyncOp>();
  let applyingRemoteDepth = 0;
  let boundUserId: string | undefined;
  let switching = false;

  const now = () => (deps.now ? deps.now() : Date.now());

  function activeUserId(): string | undefined {
    return boundUserId ?? deps.userId?.();
  }

  function persistPendingOps() {
    if (!boundUserId)
      return;
    const key = syncSessionKeys(boundUserId).pending;
    const ops = Array.from(pendingOps.values());
    try {
      if (!ops.length)
        deps.storage.removeItem(key);
      else
        deps.storage.setItem(key, JSON.stringify(ops));
    }
    catch {
      /* 隐私模式 / 配额：内存队列仍可用 */
    }
  }

  function hydratePendingOpsFromStorage(userId = activeUserId()) {
    pendingOps.clear();
    if (!userId)
      return;
    migrateLegacySyncKeys(deps.storage, userId);
    const raw = readJson<CloudSyncOp[]>(
      deps.storage,
      syncSessionKeys(userId).pending,
      [],
    );
    for (const op of Array.isArray(raw) ? raw : []) {
      if (op?.type && op?.op && op?.entityId)
        pendingOps.set(syncOpKey(op), op);
    }
  }

  function bindUser(userId: string | undefined) {
    if (userId === boundUserId)
      return;
    switching = true;
    persistPendingOps();
    resetEntityTs();
    boundUserId = userId;
    hydratePendingOpsFromStorage(userId);
    switching = false;
  }

  function relatedKeysToDrop(op: CloudSyncOp): string[] {
    const keys: string[] = [];
    if (op.op === 'removeItem') {
      keys.push(
        syncOpKey({ ...op, op: 'upsertItem' }),
        syncOpKey({ ...op, op: 'updateProgress' }),
      );
    }
    if (op.op === 'removeShelf') {
      for (const [key, pending] of pendingOps) {
        if (
          pending.type === op.type
          && (pending.entityId === op.entityId
            || pending.parentId === op.entityId)
        ) {
          keys.push(key);
        }
      }
    }
    if (op.op === 'removeSubscribe')
      keys.push(syncOpKey({ ...op, op: 'upsertSubscribe' }));
    if (op.op === 'removeSongPlaylist')
      keys.push(syncOpKey({ ...op, op: 'upsertSongPlaylist' }));
    return keys;
  }

  function enqueueOp(op: CloudSyncOp) {
    if (switching)
      return;
    if (deps.canEnqueue && !deps.canEnqueue())
      return;
    if (!activeUserId())
      return;
    if (deps.isTypeEnabled && !deps.isTypeEnabled(op.type))
      return;

    const key = syncOpKey(op);
    for (const drop of relatedKeysToDrop(op))
      pendingOps.delete(drop);

    const tsKey = entityTsKey(op.type, op.entityId, op.parentId);
    const clientUpdatedAt = nextLogicalTime(tsKey, op.clientUpdatedAt || now());
    const withMutation: CloudSyncOp = {
      ...op,
      clientUpdatedAt,
      clientMutationId: op.clientMutationId || deps.randomId(),
      deviceId: op.deviceId || deps.getDeviceId(),
    };

    if (op.op === 'updateProgress') {
      const upsertKey = syncOpKey({ ...op, op: 'upsertItem' });
      const existingUpsert = pendingOps.get(upsertKey);
      if (existingUpsert) {
        existingUpsert.payload = {
          ...(existingUpsert.payload || {}),
          ...(op.payload || {}),
        };
        existingUpsert.clientUpdatedAt = withMutation.clientUpdatedAt;
        existingUpsert.clientMutationId = withMutation.clientMutationId;
        existingUpsert.deviceId = withMutation.deviceId;
        persistPendingOps();
        deps.onDirty?.();
        return;
      }
    }

    const existing = pendingOps.get(key);
    if (existing) {
      const payload
        = op.op === 'upsertSubscribe'
          ? mergeSubscribeSyncPayload(existing.payload, withMutation.payload)
          : {
              ...(existing.payload || {}),
              ...(withMutation.payload || {}),
            };
      pendingOps.set(key, {
        ...existing,
        ...withMutation,
        payload,
        clientMutationId: withMutation.clientMutationId,
      });
    }
    else {
      pendingOps.set(key, withMutation);
    }
    persistPendingOps();
    deps.onDirty?.();
  }

  function hasPendingOps(): boolean {
    return pendingOps.size > 0;
  }

  function peekPendingOps(): CloudSyncOp[] {
    return Array.from(pendingOps.values());
  }

  function snapshotPendingOps(): CloudSyncOp[] {
    return Array.from(pendingOps.values()).map(op => ({ ...op }));
  }

  function pendingHasStructure(): boolean {
    for (const op of pendingOps.values()) {
      if (isStructureOp(op.op as SyncOpName))
        return true;
    }
    return false;
  }

  function ackMutationIds(ids: Array<string | undefined | null>) {
    const set = new Set(ids.filter((id): id is string => !!id));
    if (!set.size)
      return;
    for (const [key, op] of pendingOps) {
      if (op.clientMutationId && set.has(op.clientMutationId))
        pendingOps.delete(key);
    }
    persistPendingOps();
  }

  function restorePendingOps(ops: CloudSyncOp[]) {
    for (const op of ops) {
      const key = syncOpKey(op);
      const current = pendingOps.get(key);
      if (current && current.clientUpdatedAt > op.clientUpdatedAt)
        continue;
      pendingOps.set(key, op);
    }
    persistPendingOps();
  }

  function clearPendingOps() {
    pendingOps.clear();
    persistPendingOps();
  }

  function isApplyingRemote(): boolean {
    return applyingRemoteDepth > 0;
  }

  async function runApplyingRemote<T>(fn: () => Promise<T> | T): Promise<T> {
    applyingRemoteDepth += 1;
    try {
      return await fn();
    }
    finally {
      applyingRemoteDepth -= 1;
    }
  }

  function takePendingOps(): CloudSyncOp[] {
    const ops = Array.from(pendingOps.values());
    pendingOps.clear();
    persistPendingOps();
    return ops;
  }

  return {
    bindUser,
    enqueueOp,
    hasPendingOps,
    peekPendingOps,
    snapshotPendingOps,
    pendingHasStructure,
    ackMutationIds,
    restorePendingOps,
    clearPendingOps,
    hydratePendingOpsFromStorage,
    isApplyingRemote,
    runApplyingRemote,
    takePendingOps,
    hasDirty: hasPendingOps,
    clearAllDirty: clearPendingOps,
    getBoundUserId: () => boundUserId,
    isSwitching: () => switching,
  };
}

export type PendingQueue = ReturnType<typeof createPendingQueue>;
