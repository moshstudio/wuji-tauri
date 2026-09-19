import type { SyncTypeChanges } from '@wuji-tauri/sync';
import {
  applyEntityChangesToData,
  applyPatchConflictsToData,
  applyPendingOpsToData,
  SyncTypes,
} from '@wuji-tauri/sync';
import { useBookShelfStore } from '@/store/bookShelfStore';
import { peekPendingOps } from '@/store/cloudSyncOps';
import { useComicShelfStore } from '@/store/comicShelfStore';
import { usePhotoShelfStore } from '@/store/photoShelfStore';
import { useSongShelfStore } from '@/store/songShelfStore';
import { useSubscribeSourceStore } from '@/store/subscribeSourceStore';
import { useVideoShelfStore } from '@/store/videoShelfStore';

export { filterOpsByEnabledTypes } from '@wuji-tauri/sync';

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
      await useSubscribeSourceStore().loadSyncData(data, {
        applyAccessPolicy: false,
      });
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

export function isSyncTypeReady(type: SyncTypes): boolean {
  return getTypeData(type) != null;
}

async function persistWithPending(type: SyncTypes, data: any, tombs: any[] = []) {
  const replayed = applyPendingOpsToData(
    type,
    data,
    peekPendingOps(),
    tombs,
  );
  if (type === SyncTypes.SubscribeSource)
    useSubscribeSourceStore().setSubscribeTombs(replayed.tombs);
  await persistType(type, replayed.data);
}

/** 应用服务端条目级增量变更 */
export async function applyEntityChanges(results: SyncTypeChanges[]) {
  if (!results?.length)
    return;
  for (const group of results) {
    const type = group.type as SyncTypes;
    if (!Object.values(SyncTypes).includes(type))
      continue;
    if (!group.changes?.length)
      continue;

    let data = getTypeData(type);
    if (data == null)
      continue;

    data = JSON.parse(JSON.stringify(data));
    const tombs = type === SyncTypes.SubscribeSource
      ? useSubscribeSourceStore().getSubscribeTombs()
      : [];
    const applied = applyEntityChangesToData(type, data, group.changes, tombs);
    await persistWithPending(type, applied.data, applied.tombs);
  }
}

/** 冲突表示服务端拒绝了本地 op，应写回服务器版本 */
export async function applyPatchConflicts(
  conflicts: Array<{
    type: SyncTypes | string;
    op: string;
    entityId: string;
    parentId?: string;
    serverUpdatedAt?: number;
    payload?: Record<string, any>;
    mutationId?: string;
  }> | undefined,
) {
  if (!conflicts?.length)
    return;
  for (const c of conflicts) {
    const type = c.type as SyncTypes;
    if (!Object.values(SyncTypes).includes(type))
      continue;
    const data = JSON.parse(JSON.stringify(getTypeData(type) || (type === SyncTypes.SongShelf ? {} : [])));
    const tombs = type === SyncTypes.SubscribeSource
      ? useSubscribeSourceStore().getSubscribeTombs()
      : [];
    const applied = applyPatchConflictsToData(type, data, c, tombs);
    await persistWithPending(type, applied.data, applied.tombs);
  }
}
