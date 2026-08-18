import type { SyncTypes } from '@/types/sync';

export type SyncOpName =
  | 'upsertShelf'
  | 'removeShelf'
  | 'upsertItem'
  | 'removeItem'
  | 'updateProgress'
  | 'upsertSubscribe'
  | 'removeSubscribe'
  | 'upsertSongPlaylist'
  | 'removeSongPlaylist'
  | 'upsertSongLike';

export interface CloudSyncOp {
  type: SyncTypes;
  op: SyncOpName;
  entityId: string;
  parentId?: string;
  payload?: Record<string, unknown>;
  clientUpdatedAt: number;
  /** 幂等键；合并同 key 时刷新 */
  clientMutationId?: string;
}

export function syncOpKey(op: CloudSyncOp): string {
  return `${op.type}|${op.op}|${op.entityId}|${op.parentId || ''}`;
}

/** 结构类操作（短防抖） */
export function isStructureOp(op: SyncOpName): boolean {
  return op !== 'updateProgress';
}
