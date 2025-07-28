import { BooksList } from '@se/book';
import { ComicsList } from '@se/comic';
import { PhotoList } from '@se/photo';
import { PlaylistList, SongList } from '@se/song';
import { VideosList } from '@se/video';

export enum SourceType {
  Photo = 'photo',
  Song = 'song',
  Video = 'video',
  Book = 'book',
  Resource = 'resource',
  Comic = 'comic',
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

export interface Source {
  item: SubscribeItem;
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
