import type { BooksList } from '@/extensions/book';
import type { ComicsList } from '@/extensions/comic';
import type { PhotoList } from '@/extensions/photo';
import type { PlaylistList, SongList } from '@/extensions/song';
import type { VideosList } from '@/extensions/video';

export interface Source {
  item: SubscribeItem;
}

export enum SourceType {
  Photo = 'photo',
  Song = 'song',
  Video = 'video',
  Book = 'book',
  Resource = 'resource',
  Comic = 'comic',
}

export interface PhotoSource extends Source {
  list?: PhotoList;
}
export interface SongSource extends Source {
  songList?: SongList;
  playlist?: PlaylistList;
}
export interface BookSource extends Source {
  list?: BooksList;
}
export interface ComicSource extends Source {
  list?: ComicsList;
}
export interface VideoSource extends Source {
  list?: VideosList;
}

export interface SubscribeItem {
  id: string;
  name: string;
  type: SourceType;
  url: string;
  disable?: boolean;
  code?: string;
}

export interface SubscribeDetail {
  id: string;
  name: string;
  version: number; // 订阅源的版本
  requireVersion?: number; // 软件所需的最低版本
  urls: SubscribeItem[];
}
export interface SubscribeSource {
  // 订阅源
  url: string;
  disable: boolean;
  detail: SubscribeDetail;
}
