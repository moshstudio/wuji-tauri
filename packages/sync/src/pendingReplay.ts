import type { SubscribeTomb } from './subscribeMerge';
import type { CloudSyncOp } from './types';
import {
  clockFromItem,
  clockFromOp,
  incomingWinsPull,
} from './clock';
import {
  applySubscribeDelete,
  applySubscribeUpsert,
  dropSubscribeTomb,
  upsertSubscribeTomb,
} from './subscribeMerge';
import { SyncTypes } from './types';

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

function shelfItemKey(
  type: SyncTypes,
): 'books' | 'comics' | 'videos' | 'photos' | null {
  if (type === SyncTypes.BookShelf)
    return 'books';
  if (type === SyncTypes.ComicShelf)
    return 'comics';
  if (type === SyncTypes.VideoShelf)
    return 'videos';
  if (type === SyncTypes.PhotoShelf)
    return 'photos';
  return null;
}

function applyPendingShelfOp(
  shelves: any[],
  op: CloudSyncOp,
  itemKey: 'books' | 'comics' | 'videos' | 'photos',
): any[] {
  if (op.op === 'removeShelf')
    return shelves.filter(s => s.id !== op.entityId);

  if (op.op === 'upsertShelf') {
    const payload = op.payload || { id: op.entityId };
    const idx = shelves.findIndex(s => s.id === op.entityId);
    if (idx >= 0) {
      shelves[idx] = {
        ...shelves[idx],
        ...payload,
        [itemKey]: shelves[idx][itemKey] || [],
      };
    }
    else {
      shelves.push({
        ...payload,
        id: (payload as any).id || op.entityId,
        [itemKey]: (payload as any)[itemKey] || [],
      });
    }
    return shelves;
  }

  if (op.op === 'removeItem') {
    const parentId = op.parentId || '';
    return shelves.map((shelf) => {
      if (parentId && shelf.id !== parentId)
        return shelf;
      const existing = (shelf[itemKey] || []).find(
        (it: any) => getItemId(it, itemKey) === op.entityId,
      );
      if (existing && !incomingWinsPull(clockFromOp(op), clockFromItem(existing)))
        return shelf;
      return {
        ...shelf,
        [itemKey]: (shelf[itemKey] || []).filter(
          (it: any) => getItemId(it, itemKey) !== op.entityId,
        ),
      };
    });
  }

  if (op.op === 'upsertItem' || op.op === 'updateProgress') {
    const parentId = op.parentId || '';
    let shelf = shelves.find(s => s.id === parentId);
    if (!shelf) {
      shelf = {
        id: parentId || 'default',
        name: '默认',
        createTime: op.clientUpdatedAt,
        [itemKey]: [],
      };
      shelves.push(shelf);
    }
    const items = shelf[itemKey] || (shelf[itemKey] = []);
    const idx = items.findIndex(
      (it: any) => getItemId(it, itemKey) === op.entityId,
    );
    const payload = op.payload || {};
    if (idx >= 0) {
      if (!incomingWinsPull(clockFromOp(op), clockFromItem(items[idx])))
        return shelves;
      items[idx] = { ...items[idx], ...payload };
    }
    else {
      items.push(payload);
    }
  }
  return shelves;
}

function applyPendingSongOp(data: any, op: CloudSyncOp): any {
  if (op.op === 'upsertSongLike') {
    if (op.payload)
      data.songLikeShelf = op.payload;
    return data;
  }
  if (op.op === 'removeSongPlaylist') {
    data.songCreateShelf = (data.songCreateShelf || []).filter(
      (s: any) => s.playlist?.id !== op.entityId,
    );
    data.songPlaylistShelf = (data.songPlaylistShelf || []).filter(
      (s: any) => s.playlist?.id !== op.entityId,
    );
    return data;
  }
  if (op.op === 'upsertSongPlaylist' && op.payload) {
    const payload = op.payload as any;
    const bucket
      = payload._bucket === 'create' ? 'songCreateShelf' : 'songPlaylistShelf';
    const list = data[bucket] || (data[bucket] = []);
    const idx = list.findIndex(
      (s: any) => s.playlist?.id === op.entityId,
    );
    const { _bucket, ...rest } = payload;
    if (idx >= 0)
      list[idx] = rest;
    else
      list.push(rest);
    data[bucket] = list;
  }
  return data;
}

function applyPendingSubscribeOps(
  data: any[],
  tombs: SubscribeTomb[],
  ops: CloudSyncOp[],
): { data: any[]; tombs: SubscribeTomb[] } {
  for (const op of ops) {
    if (op.op === 'removeSubscribe') {
      const local = data.find((s: any) => s.detail?.id === op.entityId);
      tombs = upsertSubscribeTomb(
        tombs,
        applySubscribeDelete({
          local,
          sourceId: op.entityId,
          incomingTs: op.clientUpdatedAt,
          tomb: tombs.find(t => t.sourceId === op.entityId),
        }),
      );
      data = data.filter((s: any) => s.detail?.id !== op.entityId);
      continue;
    }
    if (op.op !== 'upsertSubscribe' || !op.payload)
      continue;
    const idx = data.findIndex((s: any) => s.detail?.id === op.entityId);
    const result = applySubscribeUpsert({
      local: idx >= 0 ? data[idx] : undefined,
      incoming: op.payload as any,
      incomingTs: op.clientUpdatedAt,
      tomb: tombs.find(t => t.sourceId === op.entityId),
    });
    if (result.source) {
      if (idx >= 0)
        data[idx] = result.source;
      else
        data.push(result.source);
      tombs = dropSubscribeTomb(tombs, op.entityId);
    }
    else if (idx >= 0 && result.source === null) {
      data.splice(idx, 1);
    }
  }
  return { data, tombs };
}

/** 把尚未上传的本地操作打回即将落盘的快照，避免 pull 整表覆盖期间的用户操作丢失 */
export function applyPendingOpsToData(
  type: SyncTypes,
  data: any,
  ops: CloudSyncOp[],
  tombs: SubscribeTomb[] = [],
): { data: any; tombs: SubscribeTomb[] } {
  const typeOps = ops.filter(op => op.type === type);
  if (!typeOps.length)
    return { data, tombs };

  const itemKey = shelfItemKey(type);
  if (itemKey) {
    let shelves = Array.isArray(data) ? data : [];
    for (const op of typeOps)
      shelves = applyPendingShelfOp(shelves, op, itemKey);
    return { data: shelves, tombs };
  }
  if (type === SyncTypes.SubscribeSource) {
    const list = Array.isArray(data) ? data : [];
    return applyPendingSubscribeOps(list, tombs, typeOps);
  }
  if (type === SyncTypes.SongShelf) {
    const next = data || {};
    for (const op of typeOps)
      applyPendingSongOp(next, op);
    return { data: next, tombs };
  }
  return { data, tombs };
}
