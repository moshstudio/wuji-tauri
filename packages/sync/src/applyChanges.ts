import type { SubscribeTomb } from './subscribeMerge';
import type { CloudSyncOp, SyncEntityChange, SyncPatchConflict, SyncTypes } from './types';
import {
  clockFromItem,
  entityTsKey,
  incomingWinsPull,
  rememberEntityTs,
} from './clock';
import {
  applySubscribeDelete,
  applySubscribeUpsert,
  dropSubscribeTomb,

  upsertSubscribeTomb,
} from './subscribeMerge';
import { SyncTypes as SyncTypeEnum } from './types';

function changeClock(change: SyncEntityChange) {
  return {
    clientUpdatedAt: Number(change.clientUpdatedAt || 0),
    deviceId: change.deviceId,
    mutationId: change.mutationId,
  };
}

function shelfClock(shelf: any) {
  return {
    clientUpdatedAt: Number(shelf?.createTime || 0),
    deviceId: shelf?._sync?.deviceId,
    mutationId: shelf?._sync?.mutationId,
  };
}

function shelfItemKey(
  type: SyncTypes,
): 'books' | 'comics' | 'videos' | 'photos' | null {
  if (type === SyncTypeEnum.BookShelf)
    return 'books';
  if (type === SyncTypeEnum.ComicShelf)
    return 'comics';
  if (type === SyncTypeEnum.VideoShelf)
    return 'videos';
  if (type === SyncTypeEnum.PhotoShelf)
    return 'photos';
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
    if (change.deleted) {
      const existing = shelves.find(s => s.id === change.entityId);
      if (existing && !incomingWinsPull(changeClock(change), shelfClock(existing)))
        return shelves;
      return shelves.filter(s => s.id !== change.entityId);
    }
    const payload = change.payload || { id: change.entityId };
    const idx = shelves.findIndex(s => s.id === change.entityId);
    if (idx >= 0) {
      if (!incomingWinsPull(changeClock(change), shelfClock(shelves[idx])))
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
      const existing = (shelf[itemKey] || []).find(
        (it: any) => getItemId(it, itemKey) === change.entityId,
      );
      if (existing && !incomingWinsPull(changeClock(change), clockFromItem(existing)))
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
      if (!incomingWinsPull(changeClock(change), clockFromItem(items[idx])))
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

export function applyEntityChangesToData(
  type: SyncTypes,
  data: any,
  changes: SyncEntityChange[],
  tombs: SubscribeTomb[] = [],
): { data: any; tombs: SubscribeTomb[] } {
  if (!changes?.length)
    return { data, tombs };

  const itemKey = shelfItemKey(type);
  let next = data;
  let nextTombs = tombs;

  for (const change of changes) {
    rememberEntityTs(
      entityTsKey(type, change.entityId, change.parentId),
      change.clientUpdatedAt,
    );
    if (itemKey) {
      next = applyShelfChange(next, change, itemKey);
    }
    else if (type === SyncTypeEnum.SubscribeSource) {
      if (change.kind === 'subscribe') {
        if (change.deleted) {
          const local = next.find((s: any) => s.detail?.id === change.entityId);
          const localTs = Math.max(
            Number(local?.contentUpdatedAt || 0),
            Number(local?.flagsUpdatedAt || 0),
          );
          if (local && localTs > change.clientUpdatedAt)
            continue;
          nextTombs = upsertSubscribeTomb(
            nextTombs,
            applySubscribeDelete({
              local,
              sourceId: change.entityId,
              incomingTs: change.clientUpdatedAt,
              tomb: nextTombs.find(t => t.sourceId === change.entityId),
            }),
          );
          next = next.filter((s: any) => s.detail?.id !== change.entityId);
        }
        else if (change.payload) {
          const idx = next.findIndex(
            (s: any) => s.detail?.id === change.entityId,
          );
          const result = applySubscribeUpsert({
            local: idx >= 0 ? next[idx] : undefined,
            incoming: change.payload as any,
            incomingTs: change.clientUpdatedAt,
            tomb: nextTombs.find(t => t.sourceId === change.entityId),
            mode: 'snapshot',
          });
          if (result.source) {
            if (idx >= 0)
              next[idx] = result.source;
            else
              next.push(result.source);
            nextTombs = dropSubscribeTomb(nextTombs, change.entityId);
          }
          else if (idx >= 0 && result.source === null) {
            next.splice(idx, 1);
          }
        }
      }
    }
    else if (type === SyncTypeEnum.SongShelf) {
      next = applySongChange(next, change);
    }
  }

  return { data: next, tombs: nextTombs };
}

function patchShelfItem(
  shelves: any[],
  entityId: string,
  parentId: string | undefined,
  payload: Record<string, any>,
  itemKey: 'books' | 'comics' | 'videos' | 'photos',
) {
  for (const shelf of shelves) {
    if (parentId && shelf.id !== parentId)
      continue;
    const items = shelf[itemKey];
    if (!Array.isArray(items))
      continue;
    const idx = items.findIndex(
      (it: any) => getItemId(it, itemKey) === entityId,
    );
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

export function applyPatchConflictsToData(
  type: SyncTypes,
  data: any,
  conflict: SyncPatchConflict,
  tombs: SubscribeTomb[] = [],
): { data: any; tombs: SubscribeTomb[] } {
  const payload = conflict.payload;
  const itemKey = shelfItemKey(type);

  if (itemKey) {
    if (
      (conflict.op === 'updateProgress'
        || conflict.op === 'upsertItem'
        || conflict.op === 'removeItem')
      && payload
    ) {
      patchShelfItem(data, conflict.entityId, conflict.parentId, payload, itemKey);
    }
    else if ((conflict.op === 'upsertShelf' || conflict.op === 'removeShelf') && payload) {
      const idx = data.findIndex((s: any) => s.id === conflict.entityId);
      if (idx >= 0)
        data[idx] = { ...data[idx], ...payload, [itemKey]: data[idx][itemKey] || [] };
      else
        data.push({ ...payload, [itemKey]: payload[itemKey] || [] });
    }
    return { data, tombs };
  }

  if (type === SyncTypeEnum.SubscribeSource) {
    const incomingTs = Number(conflict.serverUpdatedAt || 0);
    if ((conflict.op === 'removeSubscribe' || conflict.op === 'upsertSubscribe') && payload) {
      const idx = data.findIndex((s: any) => s.detail?.id === conflict.entityId);
      const result = applySubscribeUpsert({
        local: idx >= 0 ? data[idx] : undefined,
        incoming: payload as any,
        incomingTs,
        tomb: tombs.find(t => t.sourceId === conflict.entityId),
      });
      if (result.source) {
        if (idx >= 0)
          data[idx] = result.source;
        else
          data.push(result.source);
        tombs = dropSubscribeTomb(tombs, conflict.entityId);
      }
      else if (idx >= 0 && result.source === null) {
        data.splice(idx, 1);
      }
    }
    return { data, tombs };
  }

  if (type === SyncTypeEnum.SongShelf) {
    if (conflict.op === 'upsertSongLike' && payload) {
      data.songLikeShelf = payload;
    }
    else if (conflict.op === 'removeSongPlaylist' && payload) {
      const bucket
        = (payload as any)._bucket === 'create'
          ? 'songCreateShelf'
          : 'songPlaylistShelf';
      const list = data[bucket] || [];
      const idx = list.findIndex((s: any) => s.playlist?.id === conflict.entityId);
      const { _bucket, ...rest } = payload as any;
      if (idx >= 0)
        list[idx] = rest;
      else
        list.push(rest);
      data[bucket] = list;
    }
    else if (conflict.op === 'upsertSongPlaylist' && payload) {
      const bucket
        = (payload as any)._bucket === 'create'
          ? 'songCreateShelf'
          : 'songPlaylistShelf';
      const list = data[bucket] || [];
      const idx = list.findIndex((s: any) => s.playlist?.id === conflict.entityId);
      if (idx >= 0)
        list[idx] = payload;
      else
        list.push(payload);
      data[bucket] = list;
    }
  }

  return { data, tombs };
}

export function filterOpsByEnabledTypes(
  ops: CloudSyncOp[],
  enabled: (type: SyncTypes) => boolean,
): CloudSyncOp[] {
  return ops.filter(op => enabled(op.type));
}
