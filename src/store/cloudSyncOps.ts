import type { CloudSyncOp, SyncOpName } from '@/types/cloudSyncOp';
import type { SyncTypes } from '@/types/sync';
import { isStructureOp, syncOpKey } from '@/types/cloudSyncOp';
import { nanoid } from 'nanoid';

const pendingOps = new Map<string, CloudSyncOp>();
let suppressUntil = 0;
let dirtyNotifier: (() => void) | null = null;
let typeEnabledChecker: ((type: SyncTypes) => boolean) | null = null;

export function setCloudSyncDirtyNotifier(fn: (() => void) | null) {
  dirtyNotifier = fn;
}

export function setCloudSyncTypeEnabledChecker(
  fn: ((type: SyncTypes) => boolean) | null,
) {
  typeEnabledChecker = fn;
}

export function isAutoSyncSuppressed(): boolean {
  return Date.now() < suppressUntil;
}

export function suppressAutoSync(ms = 8000) {
  suppressUntil = Math.max(suppressUntil, Date.now() + ms);
}

export function resetAutoSyncSuppressForTests() {
  suppressUntil = 0;
}

/** remove* 应清掉同实体的 upsert/progress */
function relatedKeysToDrop(op: CloudSyncOp): string[] {
  const parent = op.parentId || '';
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
  if (op.op === 'removeSubscribe') {
    keys.push(syncOpKey({ ...op, op: 'upsertSubscribe' }));
  }
  if (op.op === 'removeSongPlaylist') {
    keys.push(syncOpKey({ ...op, op: 'upsertSongPlaylist' }));
  }
  void parent;
  return keys;
}

export function enqueueOp(op: CloudSyncOp) {
  if (isAutoSyncSuppressed())
    return;
  if (typeEnabledChecker && !typeEnabledChecker(op.type))
    return;
  const key = syncOpKey(op);
  for (const drop of relatedKeysToDrop(op)) {
    pendingOps.delete(drop);
  }
  const withMutation: CloudSyncOp = {
    ...op,
    clientMutationId: op.clientMutationId || nanoid(),
  };
  // updateProgress 与 upsertItem 同实体：保留更新的 payload 合并
  if (op.op === 'updateProgress') {
    const upsertKey = syncOpKey({ ...op, op: 'upsertItem' });
    const existingUpsert = pendingOps.get(upsertKey);
    if (existingUpsert) {
      existingUpsert.payload = {
        ...(existingUpsert.payload || {}),
        ...(op.payload || {}),
      };
      existingUpsert.clientUpdatedAt = op.clientUpdatedAt;
      existingUpsert.clientMutationId = withMutation.clientMutationId;
      dirtyNotifier?.();
      return;
    }
  }
  const existing = pendingOps.get(key);
  if (existing) {
    // 同 key 覆盖时换新 mutationId，避免旧幂等键挡住新内容
    pendingOps.set(key, {
      ...existing,
      ...withMutation,
      payload: {
        ...(existing.payload || {}),
        ...(withMutation.payload || {}),
      },
      clientMutationId: withMutation.clientMutationId,
    });
  }
  else {
    pendingOps.set(key, withMutation);
  }
  dirtyNotifier?.();
}

export function hasPendingOps(): boolean {
  return pendingOps.size > 0;
}

export function peekPendingOps(): CloudSyncOp[] {
  return Array.from(pendingOps.values());
}

export function pendingHasStructure(): boolean {
  for (const op of pendingOps.values()) {
    if (isStructureOp(op.op as SyncOpName))
      return true;
  }
  return false;
}

export function takePendingOps(): CloudSyncOp[] {
  const ops = Array.from(pendingOps.values());
  pendingOps.clear();
  return ops;
}

export function restorePendingOps(ops: CloudSyncOp[]) {
  for (const op of ops) {
    pendingOps.set(syncOpKey(op), op);
  }
}

export function clearPendingOps() {
  pendingOps.clear();
}

// —— 兼容旧 API（测试与过渡） ——
export function hasDirty(): boolean {
  return hasPendingOps();
}

export function clearAllDirty() {
  clearPendingOps();
}
