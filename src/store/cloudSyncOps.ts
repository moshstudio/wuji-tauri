import type { CloudSyncOp, SyncTypes } from '@wuji-tauri/sync';
import {
  createPendingQueue,
  getOrCreateDeviceId,
} from '@wuji-tauri/sync';
import { nanoid } from 'nanoid';

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

let allowed = false;
let typeEnabledChecker: ((type: SyncTypes) => boolean) | null = null;
let dirtyNotifier: (() => void) | null = null;

const queue = createPendingQueue({
  storage: browserStorage,
  randomId: () => nanoid(),
  getDeviceId: () => getOrCreateDeviceId(browserStorage, nanoid),
  canEnqueue: () => allowed,
  isTypeEnabled: (type) => {
    if (typeEnabledChecker)
      return typeEnabledChecker(type);
    return true;
  },
  onDirty: () => dirtyNotifier?.(),
});

export function bindCloudSyncSession(params: {
  userId?: string;
  canEnqueue: boolean;
}) {
  allowed = !!params.canEnqueue && !!params.userId;
  queue.bindUser(params.userId);
}

export function setCloudSyncDirtyNotifier(fn: (() => void) | null) {
  dirtyNotifier = fn;
}

export function setCloudSyncTypeEnabledChecker(
  fn: ((type: SyncTypes) => boolean) | null,
) {
  typeEnabledChecker = fn;
}

export function enqueueOp(op: CloudSyncOp) {
  return queue.enqueueOp(op);
}
export function hasPendingOps() {
  return queue.hasPendingOps();
}
export function peekPendingOps() {
  return queue.peekPendingOps();
}
export function snapshotPendingOps() {
  return queue.snapshotPendingOps();
}
export function pendingHasStructure() {
  return queue.pendingHasStructure();
}
export function ackMutationIds(ids: Array<string | undefined | null>) {
  return queue.ackMutationIds(ids);
}
export function restorePendingOps(ops: CloudSyncOp[]) {
  return queue.restorePendingOps(ops);
}
export function clearPendingOps() {
  return queue.clearPendingOps();
}
export function hydratePendingOpsFromStorage() {
  return queue.hydratePendingOpsFromStorage();
}
export function isApplyingRemote() {
  return queue.isApplyingRemote();
}
export function runApplyingRemote<T>(fn: () => Promise<T> | T) {
  return queue.runApplyingRemote(fn);
}
export function takePendingOps() {
  return queue.takePendingOps();
}
export function hasDirty() {
  return queue.hasDirty();
}
export function clearAllDirty() {
  return queue.clearAllDirty();
}
