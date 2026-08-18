import type { SyncTypes } from '@/types/sync';

export interface SyncEntityChange {
  kind: string;
  entityId: string;
  parentId?: string;
  payload?: Record<string, unknown>;
  clientUpdatedAt: number;
  version?: number;
  deleted: boolean;
}

export interface SyncTypeChanges {
  type: SyncTypes | string;
  /** 服务端单调 version 游标（十进制字符串） */
  cursor: string;
  changes: SyncEntityChange[];
}

export interface SyncChangesResponse {
  results: SyncTypeChanges[];
}
