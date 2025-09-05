export enum SyncTypes {
  PhotoShelf = 'PhotoShelf',
  SongShelf = 'SongShelf',
  BookShelf = 'BookShelf',
  ComicShelf = 'ComicShelf',
  VideoShelf = 'VideoShelf',
  SubscribeSource = 'SubscribeSource',
}

export interface SyncOption {
  type: SyncTypes;
  name: string;
  sync: boolean;
  size?: number;
}
