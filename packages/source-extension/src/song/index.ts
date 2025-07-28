import { Extension, transformResult } from '../baseExtension';

export enum SongShelfType {
  create = 'create', // 自建歌单
  like = 'like', // 我喜欢的音乐
  playlist = 'playlist', // 收藏的歌单
}
export enum SongPlayMode {
  single = 'single', // 单曲循环
  list = 'list', // 列表循环
  random = 'random', // 随机播放
}

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
  playUrl?: string | SongUrlMap;
  picUrl?: string;
  bigPicUrl?: string;
  picHeaders?: Record<string, string>;
  flac?: string;
  duration?: number;
  sourceId: string;
  extra?: Record<string, string>;
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
  url?: string;
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
  extra?: Record<string, string>;
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
export interface SongUrlMap {
  '128k'?: string;
  '128'?: string;
  '320k'?: string;
  '320'?: string;
  flac?: string;
  pic?: string;
  bgPic?: string;
  lyric?: string;
  lyricUrl?: string;
  headers?: Record<string, string>;
}

abstract class SongExtension extends Extension {
  hasDetailPage: boolean = true;

  public constructor() {
    super();
  }

  @transformResult<PlaylistList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id || item.url || item.name + item.sourceId);
        item.list?.list.forEach((songItem) => {
          songItem.id = String(songItem.id);
        });
      });
    }
    return r;
  })
  async execGetRecommendPlaylists(pageNo?: number) {
    pageNo = pageNo || 1;
    const ret = await this.getRecommendPlaylists(pageNo);
    ret?.list.forEach((item) => {
      item.sourceId = String(this.id);
    });
    return ret;
  }

  abstract getRecommendPlaylists(pageNo?: number): Promise<PlaylistList | null>; // 推荐歌单

  @transformResult<SongList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id || item.playUrl || item.name + item.sourceId);
      });
    }
    return r;
  })
  async execGetRecommendSongs(pageNo?: number) {
    pageNo = pageNo || 1;
    const ret = await this.getRecommendSongs(pageNo);
    ret?.list.forEach((item) => {
      item.sourceId = String(this.id);
    });
    return ret;
  }
  // 推荐歌曲
  abstract getRecommendSongs(pageNo?: number): Promise<SongList | null>;

  @transformResult<PlaylistList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id || item.url || item.name + item.sourceId);
        item.list?.list.forEach((songItem) => {
          songItem.id = String(songItem.id);
        });
      });
    }
    return r;
  })
  async execSearchPlaylists(keyword: string, pageNo?: number) {
    if (keyword === '') {
      return await this.execGetRecommendPlaylists(pageNo);
    }
    pageNo = pageNo || 1;
    const ret = await this.searchPlaylists(keyword, pageNo);
    ret?.list.forEach((item) => {
      item.sourceId = String(this.id);
    });
    return ret;
  }
  // 搜索歌单
  abstract searchPlaylists(
    keyword: string,
    pageNo?: number,
  ): Promise<PlaylistList | null>;

  @transformResult<SongList | null>((r) => {
    if (r) {
      r.list.forEach((item) => {
        item.id = String(item.id || item.playUrl || item.name + item.sourceId);
      });
    }
    return r;
  })
  async execSearchSongs(keyword: string, pageNo?: number) {
    if (keyword === '') {
      return await this.execGetRecommendSongs(pageNo);
    }
    pageNo = pageNo || 1;
    const ret = await this.searchSongs(keyword, pageNo);
    ret?.list.forEach((item) => {
      item.sourceId = String(this.id);
    });
    return ret;
  }
  // 搜索歌曲
  abstract searchSongs(
    keyword: string,
    pageNo?: number,
  ): Promise<SongList | null>;

  @transformResult<PlaylistInfo | null>((r) => {
    if (r) {
      r.id = String(r.id);
      r.list?.list.forEach((item) => {
        item.id = String(item.id || item.playUrl || item.name + item.sourceId);
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
  async execGetPlaylistDetail(item: PlaylistInfo, pageNo?: number) {
    pageNo = pageNo || 1;
    const ret = await this.getPlaylistDetail(item, pageNo);
    if (ret) {
      ret.sourceId = this.id;
      ret.list?.list.forEach((i) => {
        i.sourceId = String(this.id);
      });
      if (!item.picUrl && ret.picUrl) {
        item.picUrl = ret.picUrl;
        item.picHeaders = ret.picHeaders;
      }
    }
    return ret;
  }
  // 获取歌单详情
  abstract getPlaylistDetail(
    item: PlaylistInfo,
    pageNo?: number,
  ): Promise<PlaylistInfo | null>;

  @transformResult<SongUrlMap | string | null>((r) => r)
  execGetSongUrl(item: SongInfo, size?: SongSize) {
    return this.getSongUrl(item, size);
  }

  abstract getSongUrl(
    item: SongInfo,
    size?: SongSize,
  ): Promise<SongUrlMap | string | null>;

  @transformResult<string | null>((r) => r)
  execGetLyric(item: SongInfo) {
    return this.getLyric(item);
  }

  abstract getLyric(item: SongInfo): Promise<string | null>;
}

function loadSongExtensionString(
  codeString: string,
): SongExtension | undefined {
  try {
    const func = new Function('SongExtension', codeString);
    const extensionclass = func(SongExtension);
    return new extensionclass();
  } catch (error) {
    console.error('Error executing code:\n', error);
  }
}

export { loadSongExtensionString, SongExtension };
