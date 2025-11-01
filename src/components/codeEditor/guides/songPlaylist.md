## 函数定义

```typescript
// 定义歌曲信息接口
export interface SongInfo {
  name?: string; // 歌曲名称（可选）
  artists?: ArtistInfo[] | string[]; // 艺人信息数组或字符串数组（可选）
  id: string; // 歌曲唯一标识（必需）
  cid?: string; // 歌曲CID（可选）
  lyric?: string; // 歌词（可选）
  album?: AlbumInfo; // 专辑信息（可选）
  mvId?: string; // MV ID（可选）
  mvCid?: string; // MV CID（可选）
  url?: string; // 详情URL（可选）
  playUrl?: string | SongUrlMap; // 播放URL，可以是字符串或SongUrlMap类型（可选）
  picUrl?: string; // 封面图片URL（可选）
  bigPicUrl?: string; // 大尺寸封面图片URL（可选）
  picHeaders?: Record<string, string>; // 图片请求头（可选）
  flac?: string; // FLAC格式音频URL（可选）
  duration?: number; // 歌曲时长（单位可能是毫秒）（可选）
  sourceId: string; // 来源ID（自动填写）
  extra?: Record<string, string>; // 额外信息键值对（可选）
}

// 定义歌曲列表接口
export interface SongList {
  list: SongInfo[]; // 歌曲信息数组（必需）
  page: number; // 当前页码（必需）
  pageSize?: number | null; // 每页大小（可选）
  totalPage?: number | null; // 总页数（可选）
}

// 定义艺人信息接口
export interface ArtistInfo {
  name: string; // 艺人名称（必需）
  id: string; // 艺人唯一标识（必需）
  picUrl?: string; // 艺人图片URL（可选）
  songCount?: string | number; // 歌曲数量（可选）
  mvCount?: number; // MV数量（可选）
  albumCount?: string | number; // 专辑数量（可选）
}

// 定义专辑信息接口
export interface AlbumInfo {
  name: string; // 专辑名称（必需）
  id: string; // 专辑唯一标识（必需）
  artists?: ArtistInfo[] | string[]; // 艺人信息数组或字符串数组（可选）
  picUrl?: string; // 专辑封面URL（可选）
  publishTime?: string; // 发布时间（可选）
  desc?: string; // 专辑描述（可选）
  company?: string; // 发行公司（可选）
  songList?: SongList; // 歌曲列表（可选）
  songCount?: string | number; // 歌曲数量（可选）
  duration?: number; // 专辑总时长（可选）
}

// 定义歌单信息接口
export interface PlaylistInfo {
  name: string; // 歌单名称（必需）
  id: string; // 歌单唯一标识（必需）
  url?: string; // 歌单URL（可选）
  picUrl: string; // 歌单封面URL（必需）
  picHeaders?: Record<string, string>; // 封面图片请求头（可选）
  songCount?: string | number; // 歌曲数量（可选）
  playCount?: string | number; // 播放次数（可选）
  desc?: string; // 歌单描述（可选）
  creator?: { // 创建者信息（可选）
    id?: string; // 创建者ID（可选）
    name?: string; // 创建者名称（可选）
  };
  createTime?: string; // 创建时间（可选）
  updateTime?: string; // 更新时间（可选）
  totalPage?: number; // 总页数（可选）
  list?: SongList; // 歌曲列表（可选）
  sourceId: string; // 来源ID（自动填写）
  extra?: Record<string, string>; // 额外信息键值对（可选）
}

// 定义歌单列表接口
export interface PlaylistList {
  list: PlaylistInfo[]; // 歌单信息数组（必需）
  page: number; // 当前页码（必需）
  pageSize?: number | null; // 每页大小（可选）
  totalPage?: number | null; // 总页数（可选）
}

// 定义抽象方法：获取推荐歌单
// 参数：pageNo - 页码（可选）
// 返回：Promise包装的PlaylistList或null
abstract getRecommendPlaylists(pageNo?: number): Promise<PlaylistList | null>;
```

## 从DOM获取元素

```javascript
async function getRecommendPlaylists(pageNo) {
  pageNo ||= 1;
  const url = `${this.baseUrl}playtype/index/${pageNo}.html`;
  const document = await this.fetchDom(url);

  const list = await this.queryPlaylistElements(document, {
    element: '.video_list li',
    picUrl: 'img',
    name: '.name a',
    url: '.name a',
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
async function getRecommendPlaylists(pageNo) {
  pageNo ||= 1;
  const typeMap = {
    2: 15127272, // 最新
    1: 15127315, // 推荐
  };
  const url = `http://m.music.migu.cn/migu/remoting/playlist_bycolumnid_tag?playListType=2&type=1&columnId=${typeMap[2]}&tagId=&startIndex=${(pageNo - 1) * 10}`;
  const data = await this.fetch(url);

  const list = [];
  data.retMsg.playlist.forEach((ele) => {
    list.push({
      name: ele.playListName,
      id: ele.playListId,
      picUrl: ele.image,
      desc: ele.summary,
      createTime: ele.createTime,
      creator: {
        id: ele.createUserId,
        name: ele.createName,
      },
      songCount: ele.contentCount,
      playCount: ele.playCount,
      sourceId: '',
      extra: { type: ele.playListType },
    });
  });
  return {
    list,
    page: pageNo,
    pageSize: 10,
    totalPage: Math.ceil(Number(data.retMsg.countSize) / 10),
  };
}
```
