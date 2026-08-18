import type { CloudSyncOp } from '@/types/cloudSyncOp';
import type { SyncEntityChange, SyncTypeChanges } from '@/types/cloudSyncChanges';
import { SyncTypes } from '@/types/sync';
import { useBookShelfStore } from '@/store/bookShelfStore';
import { useComicShelfStore } from '@/store/comicShelfStore';
import { usePhotoShelfStore } from '@/store/photoShelfStore';
import { useSongShelfStore } from '@/store/songShelfStore';
import { useSubscribeSourceStore } from '@/store/subscribeSourceStore';
import { useVideoShelfStore } from '@/store/videoShelfStore';
import { suppressAutoSync } from '@/store/cloudSyncOps';

function itemTime(item: any): number {
  return Number(item?.lastReadTime || item?.createTime || 0);
}

function shelfItemKey(
  type: SyncTypes,
): 'books' | 'comics' | 'videos' | null {
  if (type === SyncTypes.BookShelf)
    return 'books';
  if (type === SyncTypes.ComicShelf)
    return 'comics';
  if (type === SyncTypes.VideoShelf)
    return 'videos';
  return null;
}

function getItemId(item: any, itemKey: string): string | undefined {
  if (itemKey === 'books')
    return item.book?.id;
  if (itemKey === 'comics')
    return item.comic?.id;
  if (itemKey === 'videos')
    return item.video?.id;
  if (itemKey === 'photos')
    return item.id;
  return undefined;
}

function applyShelfChange(
  shelves: any[],
  change: SyncEntityChange,
  itemKey: 'books' | 'comics' | 'videos' | 'photos',
): any[] {
  if (change.kind === 'shelf') {
    if (change.deleted)
      return shelves.filter(s => s.id !== change.entityId);
    const payload = change.payload || { id: change.entityId };
    const idx = shelves.findIndex(s => s.id === change.entityId);
    if (idx >= 0) {
      const localTs = Number(shelves[idx].createTime || 0);
      if (change.clientUpdatedAt < localTs)
        return shelves;
      shelves[idx] = {
        ...shelves[idx],
        ...payload,
        [itemKey]: shelves[idx][itemKey] || [],
      };
    }
    else {
      shelves.push({
        ...payload,
        id: (payload as any).id || change.entityId,
        [itemKey]: (payload as any)[itemKey] || [],
      });
    }
    return shelves;
  }

  if (change.kind === 'item') {
    const parentId = change.parentId || '';
    let shelf = shelves.find(s => s.id === parentId);
    if (change.deleted) {
      if (!shelf)
        return shelves;
      shelf[itemKey] = (shelf[itemKey] || []).filter(
        (it: any) => getItemId(it, itemKey) !== change.entityId,
      );
      return shelves;
    }
    if (!shelf) {
      shelf = {
        id: parentId || 'default',
        name: '默认',
        createTime: change.clientUpdatedAt,
        [itemKey]: [],
      };
      shelves.push(shelf);
    }
    const items = shelf[itemKey] || (shelf[itemKey] = []);
    const idx = items.findIndex(
      (it: any) => getItemId(it, itemKey) === change.entityId,
    );
    const payload = change.payload || {};
    if (idx >= 0) {
      if (change.clientUpdatedAt < itemTime(items[idx]))
        return shelves;
      items[idx] = { ...items[idx], ...payload };
    }
    else {
      items.push(payload);
    }
  }
  return shelves;
}

function applySongChange(data: any, change: SyncEntityChange) {
  if (change.kind === 'songLike') {
    if (change.deleted) {
      if (data.songLikeShelf?.playlist?.list)
        data.songLikeShelf.playlist.list.list = [];
      return data;
    }
    if (change.payload)
      data.songLikeShelf = change.payload;
    return data;
  }
  if (change.kind === 'songPlaylist') {
    const buckets = ['songCreateShelf', 'songPlaylistShelf'] as const;
    if (change.deleted) {
      for (const b of buckets) {
        data[b] = (data[b] || []).filter(
          (s: any) => s.playlist?.id !== change.entityId,
        );
      }
      return data;
    }
    const payload = change.payload || {};
    const bucket
      = (payload as any)._bucket === 'create'
        ? 'songCreateShelf'
        : 'songPlaylistShelf';
    const list = data[bucket] || (data[bucket] = []);
    const idx = list.findIndex(
      (s: any) => s.playlist?.id === change.entityId,
    );
    const { _bucket, ...rest } = payload as any;
    if (idx >= 0)
      list[idx] = rest;
    else
      list.push(rest);
  }
  return data;
}

async function persistType(type: SyncTypes, data: any) {
  switch (type) {
    case SyncTypes.BookShelf:
      await useBookShelfStore().loadSyncData(data);
      break;
    case SyncTypes.ComicShelf:
      await useComicShelfStore().loadSyncData(data);
      break;
    case SyncTypes.VideoShelf:
      await useVideoShelfStore().loadSyncData(data);
      break;
    case SyncTypes.PhotoShelf:
      await usePhotoShelfStore().loadSyncData(data);
      break;
    case SyncTypes.SongShelf:
      await useSongShelfStore().loadSyncData(data);
      break;
    case SyncTypes.SubscribeSource:
      await useSubscribeSourceStore().loadSyncData(data);
      break;
    default:
      break;
  }
}

function getTypeData(type: SyncTypes): any {
  switch (type) {
    case SyncTypes.BookShelf:
      return useBookShelfStore().syncData();
    case SyncTypes.ComicShelf:
      return useComicShelfStore().syncData();
    case SyncTypes.VideoShelf:
      return useVideoShelfStore().syncData();
    case SyncTypes.PhotoShelf:
      return usePhotoShelfStore().syncData();
    case SyncTypes.SongShelf:
      return useSongShelfStore().syncData();
    case SyncTypes.SubscribeSource:
      return useSubscribeSourceStore().syncData();
    default:
      return null;
  }
}

/** 应用服务端条目级增量变更 */
export async function applyEntityChanges(results: SyncTypeChanges[]) {
  if (!results?.length)
    return;
  suppressAutoSync(8000);
  for (const group of results) {
    const type = group.type as SyncTypes;
    if (!Object.values(SyncTypes).includes(type))
      continue;
    if (!group.changes?.length)
      continue;

    const itemKey = shelfItemKey(type);
    let data = getTypeData(type);
    if (data == null)
      continue;

    // 深拷贝，避免直接改 reactive 导致中途触发其它逻辑
    data = JSON.parse(JSON.stringify(data));

    for (const change of group.changes) {
      if (itemKey) {
        data = applyShelfChange(data, change, itemKey);
      }
      else if (type === SyncTypes.PhotoShelf) {
        data = applyShelfChange(data, change, 'photos');
      }
      else if (type === SyncTypes.SubscribeSource) {
        if (change.kind === 'subscribe') {
          if (change.deleted) {
            data = data.filter((s: any) => s.detail?.id !== change.entityId);
          }
          else if (change.payload) {
            const idx = data.findIndex(
              (s: any) => s.detail?.id === change.entityId,
            );
            if (idx >= 0) {
              const localTs = Number(data[idx]?.detail?.createTime || 0);
              if (change.clientUpdatedAt >= localTs)
                data[idx] = change.payload;
            }
            else {
              data.push(change.payload);
            }
          }
        }
      }
      else if (type === SyncTypes.SongShelf) {
        data = applySongChange(data, change);
      }
    }

    await persistType(type, data);
  }
}

function patchShelfItem(
  shelves: any[],
  entityId: string,
  parentId: string | undefined,
  payload: Record<string, any>,
  itemKey: 'books' | 'comics' | 'videos',
) {
  for (const shelf of shelves) {
    if (parentId && shelf.id !== parentId)
      continue;
    const items = shelf[itemKey];
    if (!Array.isArray(items))
      continue;
    const idx = items.findIndex((it: any) => {
      const id
        = itemKey === 'books'
          ? it.book?.id
          : itemKey === 'comics'
            ? it.comic?.id
            : it.video?.id;
      return id === entityId;
    });
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...payload };
      return;
    }
  }
  if (parentId) {
    const shelf = shelves.find(s => s.id === parentId);
    if (shelf) {
      if (!Array.isArray(shelf[itemKey]))
        shelf[itemKey] = [];
      shelf[itemKey].push(payload);
    }
  }
}

/** 将 patch 冲突中的服务器版本写回本地 */
export async function applyPatchConflicts(
  conflicts: Array<{
    type: SyncTypes | string;
    op: string;
    entityId: string;
    parentId?: string;
    payload?: Record<string, any>;
  }> | undefined,
) {
  if (!conflicts?.length)
    return;
  suppressAutoSync(5000);
  for (const c of conflicts) {
    const type = c.type as SyncTypes;
    const payload = c.payload;

    if (
      type === SyncTypes.BookShelf
      || type === SyncTypes.ComicShelf
      || type === SyncTypes.VideoShelf
    ) {
      const itemKey
        = type === SyncTypes.BookShelf
          ? 'books'
          : type === SyncTypes.ComicShelf
            ? 'comics'
            : 'videos';
      const store
        = type === SyncTypes.BookShelf
          ? useBookShelfStore()
          : type === SyncTypes.ComicShelf
            ? useComicShelfStore()
            : useVideoShelfStore();
      const data = store.syncData();
      if (c.op === 'removeItem') {
        for (const shelf of data) {
          if (c.parentId && shelf.id !== c.parentId)
            continue;
          shelf[itemKey] = (shelf[itemKey] || []).filter((it: any) => {
            const id
              = itemKey === 'books'
                ? it.book?.id
                : itemKey === 'comics'
                  ? it.comic?.id
                  : it.video?.id;
            return id !== c.entityId;
          });
        }
        await store.loadSyncData(data);
      }
      else if (
        (c.op === 'updateProgress' || c.op === 'upsertItem')
        && payload
      ) {
        patchShelfItem(data, c.entityId, c.parentId, payload, itemKey);
        await store.loadSyncData(data);
      }
      else if (c.op === 'upsertShelf' && payload) {
        const idx = data.findIndex((s: any) => s.id === c.entityId);
        if (idx >= 0)
          data[idx] = { ...data[idx], ...payload };
        else
          data.push({ ...payload, [itemKey]: payload[itemKey] || [] });
        await store.loadSyncData(data);
      }
      else if (c.op === 'removeShelf') {
        await store.loadSyncData(data.filter((s: any) => s.id !== c.entityId));
      }
    }
    else if (type === SyncTypes.PhotoShelf) {
      const store = usePhotoShelfStore();
      const data = store.syncData();
      if (c.op === 'removeShelf') {
        await store.loadSyncData(data.filter((s: any) => s.id !== c.entityId));
      }
      else if (c.op === 'upsertShelf' && payload) {
        const idx = data.findIndex((s: any) => s.id === c.entityId);
        if (idx >= 0)
          data[idx] = { ...data[idx], ...payload };
        else
          data.push(payload as any);
        await store.loadSyncData(data);
      }
      else if (c.op === 'removeItem') {
        for (const shelf of data) {
          if (c.parentId && shelf.id !== c.parentId)
            continue;
          shelf.photos = (shelf.photos || []).filter(
            (p: any) => p.id !== c.entityId,
          );
        }
        await store.loadSyncData(data);
      }
      else if (c.op === 'upsertItem' && payload) {
        for (const shelf of data) {
          if (c.parentId && shelf.id !== c.parentId)
            continue;
          const idx = (shelf.photos || []).findIndex(
            (p: any) => p.id === c.entityId,
          );
          if (idx >= 0)
            shelf.photos[idx] = { ...shelf.photos[idx], ...payload };
          else
            shelf.photos = [...(shelf.photos || []), payload];
        }
        await store.loadSyncData(data);
      }
    }
    else if (type === SyncTypes.SubscribeSource) {
      const store = useSubscribeSourceStore();
      const data = store.syncData();
      if (c.op === 'removeSubscribe') {
        await store.loadSyncData(
          data.filter((s: any) => s.detail?.id !== c.entityId),
        );
      }
      else if (c.op === 'upsertSubscribe' && payload) {
        const idx = data.findIndex((s: any) => s.detail?.id === c.entityId);
        if (idx >= 0)
          data[idx] = payload as any;
        else
          data.push(payload as any);
        await store.loadSyncData(data);
      }
    }
    else if (type === SyncTypes.SongShelf) {
      const store = useSongShelfStore();
      const data = store.syncData();
      if (c.op === 'upsertSongLike' && payload) {
        data.songLikeShelf = payload as any;
        await store.loadSyncData(data);
      }
      else if (c.op === 'removeSongPlaylist') {
        data.songCreateShelf = (data.songCreateShelf || []).filter(
          (s: any) => s.playlist?.id !== c.entityId,
        );
        data.songPlaylistShelf = (data.songPlaylistShelf || []).filter(
          (s: any) => s.playlist?.id !== c.entityId,
        );
        await store.loadSyncData(data);
      }
      else if (c.op === 'upsertSongPlaylist' && payload) {
        const bucket
          = (payload as any)._bucket === 'create'
            ? 'songCreateShelf'
            : 'songPlaylistShelf';
        const list = data[bucket] || [];
        const idx = list.findIndex((s: any) => s.playlist?.id === c.entityId);
        if (idx >= 0)
          list[idx] = payload;
        else
          list.push(payload);
        data[bucket] = list;
        await store.loadSyncData(data);
      }
    }
  }
}

export function filterOpsByEnabledTypes(
  ops: CloudSyncOp[],
  enabled: (type: SyncTypes) => boolean,
): CloudSyncOp[] {
  return ops.filter(op => enabled(op.type));
}
