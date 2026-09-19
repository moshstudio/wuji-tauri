/**
 * 兼容层：队列与 ApplyingRemote 已迁至 cloudSyncOps。
 */
export {
  clearAllDirty,
  clearPendingOps as clearDirty,
  hasPendingOps as hasDirty,
  isApplyingRemote,
  runApplyingRemote,
  setCloudSyncDirtyNotifier,
} from './cloudSyncOps';
