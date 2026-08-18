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
  isIncremental?: boolean; // 是否增量更新/下载
}
