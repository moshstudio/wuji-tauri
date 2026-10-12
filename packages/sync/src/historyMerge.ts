import type { CloudSyncOp, SyncEntityChange } from './types';
import { incomingWinsPull } from './clock';
import { SyncTypes } from './types';

export type HistorySyncType
  = | SyncTypes.BookHistory
    | SyncTypes.ComicHistory
    | SyncTypes.VideoHistory;

const LIMITS: Record<HistorySyncType, number> = {
  [SyncTypes.BookHistory]: 50,
  [SyncTypes.ComicHistory]: 10,
  [SyncTypes.VideoHistory]: 10,
};

export function isHistorySyncType(type: SyncTypes): type is HistorySyncType {
  return type === SyncTypes.BookHistory
    || type === SyncTypes.ComicHistory
    || type === SyncTypes.VideoHistory;
}

export function historyLimit(type: HistorySyncType): number {
  return LIMITS[type];
}

export function historyMediaKey(type: HistorySyncType): 'book' | 'comic' | 'video' {
  if (type === SyncTypes.BookHistory)
    return 'book';
  if (type === SyncTypes.ComicHistory)
    return 'comic';
  return 'video';
}

export function historyEntityId(type: HistorySyncType, item: any): string | undefined {
  const id = item?.[historyMediaKey(type)]?.id;
  if (id == null || id === '')
    return undefined;
  return String(id);
}

function pick(source: any, keys: string[]) {
  const out: Record<string, unknown> = {};
  if (!source)
    return out;
  for (const key of keys) {
    if (source[key] != null)
      out[key] = source[key];
  }
  return out;
}

function videoWatchPosition(item: any): number | undefined {
  if (typeof item?.lastWatchPosition === 'number')
    return item.lastWatchPosition;
  const video = item?.video;
  const resource = video?.resources?.find(
    (entry: any) => entry.id === video.lastWatchResourceId,
  );
  const episode = resource?.episodes?.find(
    (entry: any) => entry.id === video.lastWatchEpisodeId,
  );
  return typeof episode?.lastWatchPosition === 'number'
    ? episode.lastWatchPosition
    : undefined;
}

/** 上传用精简载荷：去掉章节目录、正文和视频资源列表 */
export function slimHistoryPayload(type: HistorySyncType, item: any) {
  const lastReadTime = Number(item?.lastReadTime || 0);
  if (type === SyncTypes.BookHistory) {
    return {
      book: pick(item?.book, ['id', 'title', 'cover', 'author', 'sourceId', 'url']),
      lastReadChapter: item?.lastReadChapter
        ? pick(item.lastReadChapter, ['id', 'title', 'url', 'readingPage', 'readingParagraph'])
        : undefined,
      lastReadTime,
    };
  }
  if (type === SyncTypes.ComicHistory) {
    return {
      comic: pick(item?.comic, ['id', 'title', 'cover', 'author', 'sourceId', 'url']),
      lastReadChapter: item?.lastReadChapter
        ? pick(item.lastReadChapter, ['id', 'title', 'url', 'readingPage'])
        : undefined,
      lastReadTime,
    };
  }
  const position = videoWatchPosition(item);
  return {
    video: pick(item?.video, [
      'id',
      'title',
      'cover',
      'sourceId',
      'url',
      'lastWatchEpisodeId',
      'lastWatchResourceId',
    ]),
    lastWatchPosition: position,
    lastReadTime,
  };
}

function applyVideoPosition(video: any, position: number | undefined) {
  if (typeof position !== 'number' || !video?.resources)
    return;
  const resource = video.resources.find(
    (entry: any) => entry.id === video.lastWatchResourceId,
  );
  const episode = resource?.episodes?.find(
    (entry: any) => entry.id === video.lastWatchEpisodeId,
  );
  if (episode)
    episode.lastWatchPosition = position;
}

function mergeHistoryRecord(type: HistorySyncType, local: any, incoming: any) {
  const key = historyMediaKey(type);
  const localMedia = local?.[key] || {};
  const incomingMedia = incoming?.[key] || {};
  const media = { ...localMedia, ...incomingMedia };
  if (localMedia.chapters != null && incomingMedia.chapters == null)
    media.chapters = localMedia.chapters;
  if (localMedia.resources != null && incomingMedia.resources == null)
    media.resources = localMedia.resources;
  if (type === SyncTypes.VideoHistory)
    applyVideoPosition(media, incoming?.lastWatchPosition ?? videoWatchPosition(local));

  const next: any = {
    ...local,
    ...incoming,
    [key]: media,
    lastReadTime: Number(incoming?.lastReadTime ?? local?.lastReadTime ?? 0),
    _sync: incoming?._sync || local?._sync,
  };
  if (type !== SyncTypes.VideoHistory)
    next.lastReadChapter = incoming?.lastReadChapter ?? local?.lastReadChapter;
  return next;
}

function recordClock(item: any) {
  return {
    clientUpdatedAt: Number(item?.lastReadTime || 0),
    deviceId: item?._sync?.deviceId,
    mutationId: item?._sync?.mutationId,
  };
}

function incomingClock(
  clientUpdatedAt: number,
  payload: any,
  deviceId?: string,
  mutationId?: string,
  deleted = false,
) {
  const payloadTime = Number(payload?.lastReadTime || 0);
  return {
    clientUpdatedAt: !deleted && payloadTime ? payloadTime : Number(clientUpdatedAt || 0),
    deviceId,
    mutationId,
  };
}

export function sortHistoryList<T extends { lastReadTime?: number }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) => Number(b.lastReadTime || 0) - Number(a.lastReadTime || 0),
  );
}

export function trimHistoryList(type: HistorySyncType, list: any[]) {
  const sorted = sortHistoryList(list);
  const kept = sorted.slice(0, historyLimit(type));
  const removedIds = sorted
    .slice(historyLimit(type))
    .map(item => historyEntityId(type, item))
    .filter((id): id is string => !!id);
  return { list: kept, removedIds };
}

function applyHistoryMutation(
  type: HistorySyncType,
  list: any[],
  entityId: string,
  deleted: boolean,
  clientUpdatedAt: number,
  payload: any,
  deviceId?: string,
  mutationId?: string,
  force = false,
) {
  const id = String(entityId);
  const idx = list.findIndex(item => historyEntityId(type, item) === id);
  const clock = incomingClock(clientUpdatedAt, payload, deviceId, mutationId, deleted);
  if (deleted) {
    if (idx < 0)
      return list;
    if (!force && !incomingWinsPull(clock, recordClock(list[idx])))
      return list;
    return list.filter((_, index) => index !== idx);
  }
  const incoming = {
    ...(payload || {}),
    lastReadTime: Number(payload?.lastReadTime || clientUpdatedAt || 0),
    _sync: { deviceId, mutationId },
  };
  if (idx < 0) {
    list.push(incoming);
    return list;
  }
  if (!force && !incomingWinsPull(clock, recordClock(list[idx])))
    return list;
  list[idx] = mergeHistoryRecord(type, list[idx], incoming);
  return list;
}

export function applyHistoryChanges(
  type: HistorySyncType,
  list: any[],
  changes: SyncEntityChange[],
  options: { force?: boolean } = {},
) {
  let next = Array.isArray(list) ? [...list] : [];
  for (const change of changes) {
    next = applyHistoryMutation(
      type,
      next,
      change.entityId,
      !!change.deleted,
      change.clientUpdatedAt,
      change.payload,
      change.deviceId,
      change.mutationId,
      options.force,
    );
  }
  return trimHistoryList(type, next);
}

export function applyPendingHistoryOps(
  type: HistorySyncType,
  list: any[],
  ops: CloudSyncOp[],
) {
  let next = Array.isArray(list) ? [...list] : [];
  for (const op of ops) {
    if (op.op !== 'upsertItem' && op.op !== 'removeItem')
      continue;
    next = applyHistoryMutation(
      type,
      next,
      op.entityId,
      op.op === 'removeItem',
      op.clientUpdatedAt,
      op.payload,
      op.deviceId,
      op.clientMutationId,
    );
  }
  return trimHistoryList(type, next);
}
