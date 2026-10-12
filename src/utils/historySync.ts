import type { HistorySyncType } from '@wuji-tauri/sync';
import {
  historyEntityId,
  isHistorySyncType,
  slimHistoryPayload,
  SyncTypes,
} from '@wuji-tauri/sync';
import { enqueueOp } from '@/store/cloudSyncOps';

export function enqueueHistoryUpsert(type: HistorySyncType, item: any) {
  const entityId = historyEntityId(type, item);
  if (!entityId)
    return;
  enqueueOp({
    type,
    op: 'upsertItem',
    entityId,
    payload: slimHistoryPayload(type, item),
    clientUpdatedAt: Number(item?.lastReadTime || 0),
  });
}

export function enqueueHistoryRemoves(
  type: HistorySyncType,
  items: any[],
) {
  const now = Date.now();
  for (const item of items) {
    const entityId = historyEntityId(type, item);
    if (!entityId)
      continue;
    enqueueOp({
      type,
      op: 'removeItem',
      entityId,
      clientUpdatedAt: Math.max(now, Number(item?.lastReadTime || 0)),
    });
  }
}

/** 本地历史变更后，上传被点开的那条，并软删被裁掉的条目 */
export function syncHistoryDiff(
  type: HistorySyncType,
  previous: any[],
  next: any[],
  touchedId?: string,
) {
  const nextIds = new Set(
    next.map(item => historyEntityId(type, item)).filter((id): id is string => !!id),
  );
  enqueueHistoryRemoves(
    type,
    previous.filter((item) => {
      const id = historyEntityId(type, item);
      return !!id && !nextIds.has(id);
    }),
  );
  if (!touchedId)
    return;
  const touched = next.find(item => historyEntityId(type, item) === touchedId);
  if (touched)
    enqueueHistoryUpsert(type, touched);
}

export function enqueueRemovedHistoryIds(type: SyncTypes, ids: string[]) {
  if (!isHistorySyncType(type) || !ids.length)
    return;
  const now = Date.now();
  for (const entityId of ids) {
    if (!entityId)
      continue;
    enqueueOp({
      type,
      op: 'removeItem',
      entityId,
      clientUpdatedAt: now,
    });
  }
}

