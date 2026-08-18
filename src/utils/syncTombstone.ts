import type { SyncTombstone } from '@/types/cloudSync';
import type { SyncTypes } from '@/types/sync';

export interface ServerDeletedEntity {
  kind: string;
  entityId: string;
  parentId?: string;
  clientUpdatedAt?: number;
}

/** 将服务端软删记录转为本地 merge 用的 SyncTombstone */
export function serverDeletedToTombstones(
  type: SyncTypes,
  deleted: ServerDeletedEntity[] | undefined,
): SyncTombstone[] {
  if (!deleted?.length)
    return [];
  const out: SyncTombstone[] = [];
  for (const d of deleted) {
    switch (d.kind) {
      case 'shelf':
        out.push({ type, kind: 'shelf', shelfId: d.entityId });
        break;
      case 'item':
        out.push({
          type,
          kind: 'item',
          shelfId: d.parentId || '',
          itemId: d.entityId,
        });
        break;
      case 'subscribe':
        out.push({ type, kind: 'subscribe', sourceId: d.entityId });
        break;
      case 'songPlaylist':
        out.push({ type, kind: 'songPlaylist', playlistId: d.entityId });
        break;
      case 'songLike':
        // merge 层用特殊 playlistId 标记
        out.push({ type, kind: 'songPlaylist', playlistId: '__songLike__' });
        break;
      default:
        break;
    }
  }
  return out;
}
