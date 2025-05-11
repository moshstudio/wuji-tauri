## 函数定义

```typescript
/**
 * 歌曲信息接口
 */
export interface SongInfo {
  name?: string; // 歌曲名称
  artists?: ArtistInfo[] | string[]; // 艺人信息数组或字符串数组
  id: string; // 歌曲唯一标识
  cid?: string; // 歌曲CID
  lyric?: string; // 歌词
  album?: AlbumInfo; // 专辑信息
  mvId?: string; // MV ID
  mvCid?: string; // MV CID
  playUrl?: string | SongUrlMap; // 播放URL或URL映射
  picUrl?: string; // 封面图片URL
  bigPicUrl?: string; // 大尺寸封面图片URL
  picHeaders?: Record<string, string>; // 图片请求头
  flac?: string; // FLAC格式音频URL
  duration?: number; // 歌曲时长(毫秒)
  sourceId: string; // 来源ID 自动填充
  extra?: Record<string, string>; // 额外信息
}

/**
 * 歌曲列表接口
 */
export interface SongList {
  list: SongInfo[]; // 歌曲列表
  page: number; // 当前页码
  pageSize?: number | null; // 每页大小
  totalPage?: number | null; // 总页数
}

/**
 * 艺人信息接口
 */
export interface ArtistInfo {
  name: string; // 艺人名称
  id: string; // 艺人ID
  picUrl?: string; // 艺人图片URL
  songCount?: string | number; // 歌曲数量
  mvCount?: number; // MV数量
  albumCount?: string | number; // 专辑数量
}

/**
 * 专辑信息接口
 */
export interface AlbumInfo {
  name: string; // 专辑名称
  id: string; // 专辑ID
  artists?: ArtistInfo[] | string[]; // 艺人信息
  picUrl?: string; // 专辑封面URL
  publishTime?: string; // 发布时间
  desc?: string; // 专辑描述
  company?: string; // 发行公司
  songList?: SongList; // 歌曲列表
  songCount?: string | number; // 歌曲数量
  duration?: number; // 专辑总时长(毫秒)
}

/**
 * 歌单信息接口
 */
export interface PlaylistInfo {
  name: string; // 歌单名称
  id: string; // 歌单ID
  url?: string; // 歌单URL
  picUrl: string; // 歌单封面URL
  picHeaders?: Record<string, string>; // 封面图片请求头
  songCount?: string | number; // 歌曲数量
  playCount?: string | number; // 播放次数
  desc?: string; // 歌单描述
  creator?: { // 创建者信息
    id?: string; // 创建者ID
    name?: string; // 创建者名称
  };
  createTime?: string; // 创建时间
  updateTime?: string; // 更新时间
  totalPage?: number; // 总页数
  list?: SongList; // 歌曲列表
  sourceId: string; // 来源ID 自动填充
  extra?: Record<string, string>; // 额外信息
}

/**
 * 获取歌单详情抽象方法
 * @param item 歌单基本信息
 * @param pageNo 页码(可选)
 * @returns 返回包含完整歌单信息的Promise
 */
abstract getPlaylistDetail(
    item: PlaylistInfo,
    pageNo?: number,
  ): Promise<PlaylistInfo | null>;
```

## 从DOM获取元素

```javascript
async getPlaylistDetail(item, pageNo) {
  pageNo ||= 1;
  const url = item.url.replace('.html', `${pageNo}.html`);
  const document = await this.fetchDom(url);
  item.desc = document?.querySelector('.info')?.textContent;
  const list = await this.querySongElements(document, {
    element: '.play_list li',
    name: '.name a',
    url: '.name a',
  });
  list.forEach((item) => {
    if (item.name.includes('-') && item.name.split('-')[1].trim()) {
      const tmp = item.name.split('-');
      item.artists = [tmp[1].trim()];
      item.name = tmp[0].trim();
    }
  });
  const pageElements = document?.querySelectorAll('.page a');
  item.list = {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };

  return item;
}
```

## 从api获取元素

```javascript
async getPlaylistDetail(item, pageNo) {
  pageNo ||= 1;
  if (pageNo == 1) {
    const url = `http://m.music.migu.cn/migu/remoting/query_playlist_by_id_tag?onLine=1&queryChannel=0&createUserId=${item.extra?.userId || 'migu'}&contentCountMin=5&playListId=${item.id}`;
    const playListRes = await this.fetch(url);
    const listInfo = playListRes?.rsp?.playList[0];
    if (listInfo) {
      const {
        createUserId,
        playCount,
        contentCount,
        summary: desc,
        createTime,
        updateTime,
      } = listInfo;
      item.playCount = playCount;
      item.songCount = contentCount;
      item.desc = desc;
      item.creator = {
        id: createUserId,
        name: item.creator?.name,
      };
      item.createTime = createTime;
      item.updateTime = updateTime;
    }
  }

  const newUrl = `http://m.music.migu.cn/migu/remoting/playlistcontents_query_tag?playListType=${item.extra.type}&playListId=${item.id}&contentCount=${item.songCount}`;
  const playListRes = await this.fetch(newUrl);
  const songs = [];

  playListRes.contentList.forEach((s) => {
    songs.push({
      id: s.songId,
      cid: s.contentId,
      name: s.contentName,
      artists: s.singerName?.split(','),
      sourceId: '',
    });
  });
  item.list = {
    list: songs,
    page: pageNo,
    totalPage: 1,
  };

  return item;
}
```
