import type {
  BookSource,
  ComicSource,
  PhotoSource,
  SongSource,
  SubscribeItem,
  SubscribeSource,
  VideoSource,
} from '@wuji-tauri/source-extension';
import { showConfirmDialog, showToast } from 'vant';
import { useStore, useSubscribeSourceStore } from '@/store';

export type SourceKind = 'book' | 'comic' | 'video' | 'song' | 'photo';

export interface SourceByKind {
  book: BookSource;
  comic: ComicSource;
  video: VideoSource;
  song: SongSource;
  photo: PhotoSource;
}

const SOURCE_LABEL: Record<SourceKind, string> = {
  book: '书籍源',
  comic: '漫画源',
  video: '视频源',
  song: '音乐源',
  photo: '图源',
};

export function findSubscribeItem(sourceId: string): {
  subscribe: SubscribeSource;
  item: SubscribeItem;
} | undefined {
  const subscribeStore = useSubscribeSourceStore();
  for (const subscribe of subscribeStore.subscribeSources) {
    const item = subscribe.detail?.urls?.find(u => u.id === sourceId);
    if (item)
      return { subscribe, item };
  }
  return undefined;
}

export function enableSubscribeItemById(sourceId: string): boolean {
  return useSubscribeSourceStore().enableSubscribeItemById(sourceId);
}

function getSourceByKind<K extends SourceKind>(
  kind: K,
  sourceId: string,
): SourceByKind[K] | undefined {
  const store = useStore();
  switch (kind) {
    case 'book':
      return store.getBookSource(sourceId) as SourceByKind[K] | undefined;
    case 'comic':
      return store.getComicSource(sourceId) as SourceByKind[K] | undefined;
    case 'video':
      return store.getVideoSource(sourceId) as SourceByKind[K] | undefined;
    case 'song':
      return store.getSongSource(sourceId) as SourceByKind[K] | undefined;
    case 'photo':
      return store.getPhotoSource(sourceId) as SourceByKind[K] | undefined;
    default:
      return undefined;
  }
}

export type EnsureSourceResult<K extends SourceKind>
  = | { ok: true; source: SourceByKind[K] }
    | { ok: false; action: 'cancelled' | 'unavailable' | 'not-found' };

/**
 * 确保订阅源可用：已启用直接返回；未启用则询问是否立即启用。
 */
export async function ensureSource<K extends SourceKind>(
  sourceId: string,
  kind: K,
): Promise<EnsureSourceResult<K>> {
  const existing = getSourceByKind(kind, sourceId);
  if (existing)
    return { ok: true, source: existing };

  const found = findSubscribeItem(sourceId);
  const isDisabled = !!(
    found
    && (found.item.disable || found.subscribe.disable)
  );
  const label = SOURCE_LABEL[kind];

  if (isDisabled && found) {
    const subscribeStore = useSubscribeSourceStore();
    if (!subscribeStore.canEnableSubscribeSource(found.subscribe)) {
      subscribeStore.assertCanEnableSource(found.subscribe);
      return { ok: false, action: 'unavailable' };
    }
    try {
      await showConfirmDialog({
        title: '源未启用',
        message: `「${found.item.name}」尚未启用，是否立即启用？`,
        confirmButtonText: '启用',
        cancelButtonText: '取消',
      });
    }
    catch {
      return { ok: false, action: 'cancelled' };
    }

    if (!enableSubscribeItemById(sourceId)) {
      showToast('启用源失败');
      return { ok: false, action: 'unavailable' };
    }

    const enabled = getSourceByKind(kind, sourceId);
    if (enabled)
      return { ok: true, source: enabled };

    showToast('启用源失败');
    return { ok: false, action: 'unavailable' };
  }

  showToast(found ? `${label}不可用` : `${label}不存在或已删除`);
  return { ok: false, action: found ? 'unavailable' : 'not-found' };
}
