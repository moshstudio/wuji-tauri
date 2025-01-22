import { SongShelfType } from '@/types/song';
import { Extension } from '../baseExtension';

// 歌曲 信息
export interface SongInfo {
  name?: string;
  artists?: ArtistInfo[] | string[];
  id: string;
  cid?: string;
  lyric?: string;
  album?: AlbumInfo;
  mvId?: string;
  mvCid?: string;
  url?: string | SongUrlMap;
  picUrl?: string;
  bigPicUrl?: string;
  flac?: string;
  duration?: number;
  sourceId: string;
}

export interface SongList {
  list: SongInfo[];
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
}

// 艺人 信息
export interface ArtistInfo {
  name: string;
  id: string;
  picUrl?: string;
  songCount?: string | number;
  mvCount?: number;
  albumCount?: string | number;
}

// 专辑 信息
export interface AlbumInfo {
  name: string;
  id: string;
  artists?: ArtistInfo[] | string[];
  picUrl?: string;
  publishTime?: string;
  desc?: string;
  company?: string;
  songList?: SongList;
  songCount?: string | number;
  duration?: number;
}

// 歌单 信息
export interface PlaylistInfo {
  name: string;
  id: string;
  picUrl: string;
  songCount?: string | number;
  playCount?: string | number;
  desc?: string;
  creator?: {
    id?: string;
    name?: string;
  };
  createTime?: string;
  updateTime?: string;
  totalPage?: number;
  list?: SongList;
  sourceId: string;
}
export interface SongShelf {
  playlist: PlaylistInfo;
  type: SongShelfType;
  createTime: number;
}

export interface PlaylistList {
  list: PlaylistInfo[];
  page: number;
  pageSize?: number | null;
  totalPage?: number | null;
}

// 歌曲尺寸
export type SongSize = '128k' | '320k' | 'flac' | '';

// 歌曲 url，pic 和 bigPic 表示图片和大图
export type SongUrlMap = {
  '128k'?: string;
  '120'?: string;
  '320k'?: string;
  '320'?: string;
  flac?: string;
  pic?: string;
  bgPic?: string;
  lyric?: string;
  lyricUrl?: string;
  headers?: Record<string, string>;
};

abstract class SongExtension extends Extension {
  hasDetailPage: boolean = true;

  public constructor() {
    super();
  }
  // 推荐歌单
  abstract getRecommendPlaylists(pageNo?: number): Promise<PlaylistList | null>;
  // 推荐歌曲
  abstract getRecommendSongs(pageNo?: number): Promise<SongList | null>;
  // 搜索歌单
  abstract searchPlaylists(
    keyword: string,
    pageNo?: number
  ): Promise<PlaylistList | null>;
  // 搜索歌曲
  abstract searchSongs(
    keyword: string,
    pageNo?: number
  ): Promise<SongList | null>;
  // 获取歌单详情
  abstract getPlaylistDetail(
    item: PlaylistInfo,
    pageNo?: number
  ): Promise<PlaylistInfo | null>;

  abstract getSongUrl(
    item: SongInfo,
    size?: SongSize
  ): Promise<SongUrlMap | string | null>;

  abstract getLyric(item: SongInfo): Promise<string | null>;
}

function loadSongExtensionString(
  codeString: string
): SongExtension | undefined {
  try {
    const func = new Function('SongExtension', codeString);
    const extensionclass = func(SongExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
  }
}

export { SongExtension, loadSongExtensionString };
