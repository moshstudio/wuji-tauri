export enum SyncTypes {
  PhotoShelf = 'PhotoShelf',
  SongShelf = 'SongShelf',
  BookShelf = 'BookShelf',
  ComicShelf = 'ComicShelf',
  VideoShelf = 'VideoShelf',
  SubscribeSource = 'SubscribeSource',
}

export const SYNC_TYPE_LABELS: Record<SyncTypes, string> = {
  [SyncTypes.SubscribeSource]: '订阅源',
  [SyncTypes.PhotoShelf]: '图片收藏',
  [SyncTypes.SongShelf]: '音乐收藏',
  [SyncTypes.BookShelf]: '书籍书架',
  [SyncTypes.ComicShelf]: '漫画书架',
  [SyncTypes.VideoShelf]: '影视收藏',
};

export const ALL_SYNC_TYPES = Object.values(SyncTypes);

export interface SyncOption {
  type: SyncTypes;
  name: string;
  sync: boolean;
  size?: number;
  isIncremental?: boolean;
}

export type SyncOpName
  = | 'upsertShelf'
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
  clientMutationId?: string;
  deviceId?: string;
}

export function syncOpKey(op: CloudSyncOp): string {
  return `${op.type}|${op.op}|${op.entityId}|${op.parentId || ''}`;
}

export function isStructureOp(op: SyncOpName): boolean {
  return op !== 'updateProgress';
}

export interface SyncEntityChange {
  kind: string;
  entityId: string;
  parentId?: string;
  payload?: Record<string, unknown>;
  clientUpdatedAt: number;
  version?: number;
  deleted: boolean;
  deviceId?: string;
  mutationId?: string;
}

export interface SyncTypeChanges {
  type: SyncTypes | string;
  cursor: string;
  changes: SyncEntityChange[];
}

export interface SyncChangesResponse {
  results: SyncTypeChanges[];
}

export type CloudSyncDirtyReason = 'structure' | 'progress' | 'deletion';

export type SyncTombstone
  = | {
    type: SyncTypes;
    kind: 'shelf';
    shelfId: string;
  }
  | {
    type: SyncTypes;
    kind: 'item';
    shelfId: string;
    itemId: string;
  }
  | {
    type: SyncTypes;
    kind: 'subscribe';
    sourceId: string;
  }
  | {
    type: SyncTypes;
    kind: 'subscribeItem';
    sourceId: string;
    itemId: string;
  }
  | {
    type: SyncTypes;
    kind: 'songPlaylist';
    playlistId: string;
  }
  | {
    type: SyncTypes;
    kind: 'song';
    shelfPlaylistId: string;
    songId: string;
  };

export interface SyncUploadItem {
  type: string;
  data: string;
  baseUpdatedAt?: string;
}

export interface SyncDeletedEntity {
  kind: string;
  entityId: string;
  parentId?: string;
  clientUpdatedAt?: number;
}

export interface SyncDownloadRecord {
  type: SyncTypes | string;
  data: string;
  updatedAt?: string;
  deleted?: SyncDeletedEntity[];
}

export interface SyncPatchConflict {
  type: SyncTypes | string;
  op: string;
  entityId: string;
  parentId?: string;
  serverUpdatedAt?: number;
  payload?: Record<string, any>;
  mutationId?: string;
  deviceId?: string;
}

export interface CloudSyncTypeSettings {
  enableCloudSync: boolean;
  cloudSyncTypes: Record<SyncTypes, boolean>;
}

export function defaultCloudSyncTypes(): Record<SyncTypes, boolean> {
  return Object.fromEntries(
    ALL_SYNC_TYPES.map(t => [t, true]),
  ) as Record<SyncTypes, boolean>;
}
