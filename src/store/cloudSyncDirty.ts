/**
 * 兼容层：抑制窗口与通知器已迁至 cloudSyncOps。
 * 旧调用方可继续从本文件导入 suppressAutoSync。
 */
export {
  clearAllDirty,
  clearPendingOps as clearDirty,
  hasPendingOps as hasDirty,
  isAutoSyncSuppressed,
  resetAutoSyncSuppressForTests,
  setCloudSyncDirtyNotifier,
  suppressAutoSync,
} from './cloudSyncOps';
