import { SongShelfType } from '@/types/song';
import { Extension, transformResult } from '../baseExtension';

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
  picHeaders?: Record<string, string>;
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
  picHeaders?: Record<string, string>;
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

  @transformResult<PlaylistList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id);
        item.list?.list.forEach((songItem) => {
          songItem.id = String(songItem.id);
        });
      });
    }
    return r;
  })
  execGetRecommendPlaylists(pageNo?: number) {
    return this.getRecommendPlaylists(pageNo);
  }

  abstract getRecommendPlaylists(pageNo?: number): Promise<PlaylistList | null>; // 推荐歌单

  @transformResult<SongList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id);
      });
    }
    return r;
  })
  execGetRecommendSongs(pageNo?: number) {
    return this.getRecommendSongs(pageNo);
  }
  // 推荐歌曲
  abstract getRecommendSongs(pageNo?: number): Promise<SongList | null>;

  @transformResult<PlaylistList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id);
        item.list?.list.forEach((songItem) => {
          songItem.id = String(songItem.id);
        });
      });
    }
    return r;
  })
  execSearchPlaylists(keyword: string, pageNo?: number) {
    return this.searchPlaylists(keyword, pageNo);
  }
  // 搜索歌单
  abstract searchPlaylists(
    keyword: string,
    pageNo?: number
  ): Promise<PlaylistList | null>;

  @transformResult<SongList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id);
      });
    }
    return r;
  })
  execSearchSongs(keyword: string, pageNo?: number) {
    return this.searchSongs(keyword, pageNo);
  }
  // 搜索歌曲
  abstract searchSongs(
    keyword: string,
    pageNo?: number
  ): Promise<SongList | null>;

  @transformResult<PlaylistInfo | null>((r) => {
    if (r) {
      r.id = String(r.id);
      r.list?.list.forEach((item) => {
        item.id = String(item.id);
      });
      if (!r.picUrl) {
        if (r.list?.list.length) {
          r.picUrl = r.list.list[0].picUrl || '';
          r.picHeaders = r.list.list[0].picHeaders || {};
        }
      }
    }
    return r;
  })
  execGetPlaylistDetail(item: PlaylistInfo, pageNo?: number) {
    return this.getPlaylistDetail(item, pageNo);
  }
  // 获取歌单详情
  abstract getPlaylistDetail(
    item: PlaylistInfo,
    pageNo?: number
  ): Promise<PlaylistInfo | null>;

  @transformResult<SongUrlMap | string | null>((r) => r)
  execGetSongUrl(item: SongInfo, size?: SongSize) {
    return this.getSongUrl(item, size);
  }

  abstract getSongUrl(
    item: SongInfo,
    size?: SongSize
  ): Promise<SongUrlMap | string | null>;

  @transformResult<string | null>((r) => r)
  execGetLyric(item: SongInfo) {
    return this.getLyric(item);
  }

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
