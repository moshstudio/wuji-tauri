import type { SyncTypes } from '@/types/sync';

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
