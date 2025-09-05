import type { BooksList } from '@se/book';
import type { ComicsList } from '@se/comic';
import type { PhotoList } from '@se/photo';
import type { PlaylistList, SongList } from '@se/song';
import type { VideosList } from '@se/video';

export enum SourceType {
  Photo = 'photo',
  Song = 'song',
  Video = 'video',
  Book = 'book',
  Resource = 'resource',
  Comic = 'comic',
}

export enum MarketSourcePermission {
  NoLogin = 'noLogin',
  Login = 'login',
  Vip = 'vip',
  SuperVip = 'superVip',
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

export interface MarketSourceContent {
  _id: string;
  name: string;
  type: SourceType;
  disabled: boolean;
  source: string;
  url: string;
  code?: string;
}

export interface MarketSource {
  _id: string;
  name: string;
  version: number;
  permissions?: MarketSourcePermission[];
  sourceContents?: MarketSourceContent[];
  isPublic: boolean;
  isBanned: boolean;
  thumbsUp: number;
}

export interface PagedMarketSource {
  data: MarketSource[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
