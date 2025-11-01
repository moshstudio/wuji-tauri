## 函数定义

```typescript
// 歌曲信息接口
export interface SongInfo {
  name?: string;           // 歌曲名称（可选）
  artists?: ArtistInfo[] | string[];  // 演唱者信息，可以是ArtistInfo对象数组或字符串数组（可选）
  id: string;              // 歌曲唯一标识（必填）
  cid?: string;            // 歌曲内容ID，可能用于音源识别（可选）
  lyric?: string;          // 歌词内容（可选）
  album?: AlbumInfo;       // 所属专辑信息（可选）
  mvId?: string;           // 音乐视频ID（可选）
  mvCid?: string;          // 音乐视频内容ID（可选）
  url?: string;             // 详情页地址（可选）
  playUrl?: string | SongUrlMap;  // 播放地址，可以是字符串或SongUrlMap对象（可选）
  picUrl?: string;         // 封面图片URL（小图）（可选）
  bigPicUrl?: string;      // 封面图片URL（大图）（可选）
  picHeaders?: Record<string, string>;  // 图片请求头信息（可选）
  flac?: string;           // FLAC无损格式音频地址（可选）
  duration?: number;       // 歌曲时长（毫秒）（可选）
  sourceId: string;        // 数据来源标识（自动填充）
  extra?: Record<string, string>;  // 扩展信息键值对（可选）
}

// 歌曲列表接口
export interface SongList {
  list: SongInfo[];        // 歌曲信息数组（必填）
  page: number;            // 当前页码（必填）
  pageSize?: number | null;  // 每页显示数量（可选）
  totalPage?: number | null; // 总页数（可选）
}

// 艺人信息接口
export interface ArtistInfo {
  name: string;            // 艺人名称（必填）
  id: string;              // 艺人唯一标识（必填）
  picUrl?: string;         // 艺人头像URL（可选）
  songCount?: string | number;  // 歌曲数量（可选）
  mvCount?: number;        // MV数量（可选）
  albumCount?: string | number;  // 专辑数量（可选）
}

// 专辑信息接口
export interface AlbumInfo {
  name: string;            // 专辑名称（必填）
  id: string;              // 专辑唯一标识（必填）
  artists?: ArtistInfo[] | string[];  // 参与艺人，可以是ArtistInfo对象数组或字符串数组（可选）
  picUrl?: string;         // 专辑封面URL（可选）
  publishTime?: string;    // 发布时间（可选）
  desc?: string;           // 专辑描述（可选）
  company?: string;        // 发行公司（可选）
  songList?: SongList;     // 包含的歌曲列表（可选）
  songCount?: string | number;  // 歌曲数量（可选）
  duration?: number;       // 专辑总时长（毫秒）（可选）
}

// 抽象方法：获取推荐歌曲
// 参数：
//   pageNo - 页码（可选，默认值可能由实现决定）
// 返回值：
//   Promise包装的SongList对象或null（获取失败时返回null）
abstract getRecommendSongs(pageNo?: number): Promise<SongList | null>;
```

## 从DOM获取元素

```javascript
async function getRecommendSongs(pageNo) {
  pageNo ||= 1;
  const url = `${this.baseUrl}list/new/${pageNo}.html`;
  const document = await this.fetchDom(url);
  const list = await this.querySongElements(document, {
    element: '.play_list li',
    name: '.name a',
    url: '.name a',
  });
  list.forEach((item) => {
    if (item.name.includes('-') && item.name.split('-')[1].trim()) {
      const tmp = item.name.split('-');
      item.artists = [tmp[0].trim()];
      item.name = tmp[1].trim();
    }
  });
  const pageElements = document?.querySelectorAll('.page a');
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}
```

## 从api获取元素

```javascript
async function getRecommendSongs(pageNo) {
  pageNo ||= 1;
  const url =
    `http://m.music.migu.cn/migu/remoting/cms_list_tag` +
    `?pageSize=10&nid=23853978&pageNo=${pageNo - 1}`;
  const data = await this.fetch(url);

  if (!data || data instanceof String) {
    return null;
  }
  const list = [];
  data.result.results.forEach((ele) => {
    list.push({
      name: ele.songData.songName,
      artists: [ele.songData.singerName],
      id: ele.songData.songId || this.nanoid(),
      cid: ele.songData.copyrightId,
      lyric: ele.songData.lyricLrc,
      album: ele.songData.albumData,
      mvId: ele.songData.mvData,
      mvCid: ele.songData.mvData?.copyrightId,
      url: ele.songData.listenUrl,
      picUrl: ele.songData.picM,
      bigPicUrl: ele.songData.picL,
    });
  });

  return {
    list,
    page: pageNo,
    pageSize: data.result.pageSize,
    totalPage: Math.ceil(Number(data.result.totalCount) / data.result.pageSize),
  };
}
```
