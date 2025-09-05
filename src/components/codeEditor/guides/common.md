# 通用函数

## 1. `cryptoJs`

CryptoJS 是一个流行的加密库，提供多种加密算法。

```javascript
import CryptoJS from 'crypto-js';

this.cryptoJs = CryptoJS;
```

> 使用方法

```javascript
const hash = this.cryptoJs.MD5('message').toString();
```

## 2. `fetch`

`fetch` 用于发送 HTTP 请求, 它在浏览器 `fetch` 的基础上增加了 `verify` `noProxy` `maxRedirections`参数。

使用浏览器自带的fetch无法发送跨域请求, 使用`this.fetch`可以。

> 使用方法

```javascript
const url = 'https://www.example.com';
const response = await this.fetch(url, {
  method: 'GET',
  verify: false, // 忽略证书验证
  noProxy: false, // 不使用本机代理
  maxRedirections: 0, // 最大重定向次数
  headers: {
    referer: url,
  },
});
```

## 3. `iconv`

`iconv`(`iconv-lite`) 是一个 Node.js 的字符编码转换库，用于将字符串从一个字符编码转换为另一个字符编码。

当网页使用了gbk等编码格式，直接解析会导致乱码，需用此方法进行解码。

```javascript
import * as iconv from 'iconv-lite';

this.iconv = iconv;
```

> 使用方法

```javascript
const response = await this.fetch('https://www.example.com');
const buffer = await response.arrayBuffer();
const nodeBuffer = Buffer.from(buffer);
const html = iconv.decode(nodeBuffer, 'gbk');
```

## 4. `getProxyUrl`

无极内置代理服务器, 用于解决跨域问题, 使用 `this.getProxyUrl` 获取代理地址

```typescript
/**
 * 获取指定URL的代理地址
 *
 * @param url - 需要代理访问的原始URL
 * @param headers - 可选，需要随请求发送的HTTP头部信息，以键值对形式提供
 * @returns 返回一个Promise，解析为代理后的URL字符串；如果获取失败则返回null
 *
 * @example
 * // 基本用法
 * const proxyUrl = await getProxyUrl('https://example.com');
 *
 * // 带请求头部的用法
 * const proxyUrl = await getProxyUrl('https://api.example.com', {
 *   'Authorization': 'Bearer token123'
 * });
 */
this.getProxyUrl = async (
  url: string,
  headers?: Record<string, string>,
): Promise<string | null> => {};
```

> 使用方法

```javascript
const proxyyUrl = await this.getProxyUrl('https://www.example.com', {
  referer: 'https://www.example.com',
});
```

## 5. `_`

`_` 是一个 lodash 库的默认导出，用于处理数据。

```javascript
import _ from 'lodash';
```

> 使用方法

```javascript
const itemCloned = this._.cloneDeep(item);
```

## 6. `fetchDom`

`fetchDom` 会先使用 `this.fetch` 获取数据，然后将数据解析为 DOM。

```javascript
/**
 * 获取指定资源并解析为DOM文档对象
 *
 * @param input - 请求的资源地址，可以是URL对象、Request对象或字符串形式的URL
 * @param init - 可选的请求配置项，扩展自标准的RequestInit，可包含自定义的客户端选项
 * @param domType - 可选的文档类型，指定返回的DOM文档类型（如'text/html'、'application/xml'等）
 * @param encoding - 可选的文本编码格式，支持'utf8'（默认）或'gbk'等常见编码
 * @returns 返回一个Promise，解析为解析后的DOM Document对象
 *
 * @example
 * // 获取HTML文档
 * const doc = await fetchDom('https://example.com');
 *
 * // 获取XML文档并指定编码
 * const xmlDoc = await fetchDom('https://api.example.com/data.xml',
 *   { method: 'GET' },
 *   'application/xml',
 *   'gbk'
 * );
 */
this.fetchDom = async (
  input: URL | Request | string,
  init?: RequestInit & ClientOptions,
  domType?: DOMParserSupportedType,
  encoding?: 'utf8' | 'gbk',
): Promise<Document> =>{};
```

## 7. `queryBookElements`

`queryBookElements` 用于快速获取 `DOM` 中的元素，并返回一个包含所有匹配 `BookItem` 元素的数组。

```typescript
/**
 * 书籍项数据结构定义
 */
interface BookItem {
  /** 书籍唯一标识ID */
  id: string;

  /** 书籍标题 */
  title: string;

  /** 可选 - 书籍简介 */
  intro?: string;

  /** 可选 - 封面图片URL */
  cover?: string;

  /** 可选 - 封面图片请求头（用于需要特殊认证的封面图） */
  coverHeaders?: Record<string, string>;

  /** 可选 - 作者信息 */
  author?: string;

  /** 可选 - 标签（可以是字符串数组或以逗号分隔的字符串） */
  tags?: string[] | string;

  /** 可选 - 书籍状态（如：连载中、已完结等） */
  status?: string;

  /** 可选 - 最新章节信息（可以是字符串或完整的章节对象） */
  latestChapter?: string | BookChapter;

  /** 可选 - 最后更新时间 */
  latestUpdate?: string;

  /** 可选 - 书籍详情页URL */
  url?: string;

  /** 可选 - 章节列表数据 */
  chapters?: ChapterList;

  /** 可选 - 扩展字段（用于存储任意额外数据） */
  extra?: any;

  /** 数据来源标识ID */
  sourceId: string;
}

/**
 * 从DOM文档中查询并提取书籍元素信息
 *
 * @param body - 包含书籍列表的DOM文档对象
 * @param tags - CSS选择器配置对象，用于定位各个书籍信息元素
 *        @property element - 书籍项容器元素选择器（默认：'.bookbox'）
 *        @property cover - 封面图片元素选择器（默认：'img'）
 *        @property coverHeaders - 封面图片请求头元素选择器（用于需要特殊认证的封面图，默认：undefined）
 *        @property title - 标题元素选择器（默认：'h3 a'）
 *        @property intro - 简介元素选择器（默认：'.intro'）
 *        @property author - 作者元素选择器（默认：'.author a'）
 *        @property tags - 标签元素选择器（默认：'.tags'）
 *        @property status - 状态元素选择器（默认：'.status'）
 *        @property url - 书籍链接元素选择器（默认：'a'）
 *        @property latestChapter - 最新章节元素选择器（默认：'.latestchapter a'）
 *        @property latestUpdate - 更新时间元素选择器（默认：'.update'）
 *        @property coverDomain - 封面图片域名（用于相对路径补全，默认：undefined）
 * @returns 返回解析后的书籍项数组Promise
 *
 * @example
 * // 从页面文档中提取书籍信息
 * const books = await queryBookElements(document, {
 *   element: '.book-item',
 *   title: '.book-title a',
 *   author: '.creator'
 * });
 */
this.queryBookElements = async (
  body: Document,
  {
    element: '.bookbox',
    cover: 'img',
    coverHeaders: undefined,
    title: 'h3 a',
    intro: '.intro',
    author: '.author a',
    tags: '.tags',
    status: '.status',
    url: 'a',
    latestChapter: '.latestchapter a',
    latestUpdate: '.update',
    coverDomain: undefined,
  },
): Promise<BookItem[]> =>{};
```

## 8. `queryComicElements`

参考 `queryBookElements`即可, 参数相同

## 9. `queryVideoElements`

获取影视的元素列表

```typescript
/**
 * 视频单集信息接口
 */
interface VideoEpisode {
  /** 剧集唯一ID */
  id: string;
  /** 剧集标题 */
  title: string;
  /** 可选 - 剧集播放地址 */
  url?: string;
  /** 可选 - 扩展字段（用于存储自定义数据） */
  extra?: any;
  /** 可选 - 最后观看位置（单位：秒） */
  lastWatchPosition?: number;
}

/**
 * 视频资源信息接口（可能包含多个播放源/剧集）
 */
interface VideoResource {
  /** 资源唯一ID */
  id: string;
  /** 资源名称（如：高清源、海外源等） */
  title: string;
  /** 可选 - 资源入口地址 */
  url?: string;
  /** 可选 - 包含的剧集列表 */
  episodes?: VideoEpisode[];
  /** 可选 - 扩展字段 */
  extra?: any;
}

interface VideoItem {
  /** 视频唯一ID */
  id: string;
  /** 视频标题 */
  title: string;
  /** 可选 - 视频简介 */
  intro?: string;
  /** 可选 - 封面图URL */
  cover?: string;
  /** 可选 - 封面图请求头（用于特殊鉴权） */
  coverHeaders?: Record<string, string> | null;
  /** 可选 - 发布日期 */
  releaseDate?: string;
  /** 可选 - 国家/地区 */
  country?: string;
  /** 可选 - 视频时长 */
  duration?: string;
  /** 可选 - 导演信息 */
  director?: string;
  /** 可选 - 演员表 */
  cast?: string;
  /** 可选 - 标签（数组或字符串形式） */
  tags?: string[] | string;
  /** 可选 - 状态（如：更新中/已完结） */
  status?: string;
  /** 可选 - 最后更新时间 */
  latestUpdate?: string;
  /** 可选 - 详情页URL */
  url?: string;
  /** 可选 - 多资源列表（不同清晰度/来源） */
  resources?: VideoResource[];
  /** 可选 - 最后观看的资源ID */
  lastWatchResourceId?: string;
  /** 可选 - 最后观看的剧集ID */
  lastWatchEpisodeId?: string;
  /** 可选 - 扩展字段（结构化数据） */
  extra?: Record<string, any>;
  /** 数据来源标识 */
  sourceId: string;
}

/**
 * 从DOM文档解析视频元素信息
 * @param body - 包含视频列表的DOM文档对象
 * @param config - 解析配置对象
 *        @property [element=.bookbox] - 视频项容器选择器
 *        @property [cover=img] - 封面图元素选择器
 *        @property [coverHeaders] - 封面图请求头选择器（用于特殊鉴权）
 *        @property [title=h3 a] - 标题元素选择器
 *        @property [intro=.intro] - 简介元素选择器
 *        @property [releaseDate=.year] - 发布日期元素选择器
 *        @property [country=.area] - 国家地区元素选择器
 *        @property [duration=.time] - 时长元素选择器
 *        @property [director=.director] - 导演元素选择器
 *        @property [cast=.actor] - 演员元素选择器
 *        @property [tags=.tags] - 标签元素选择器
 *        @property [status=.status] - 状态元素选择器
 *        @property [url=a] - 链接元素选择器
 *        @property [latestUpdate=.update] - 更新时间元素选择器
 *        @property [coverDomain] - 封面图域名（用于补全相对路径）
 *        @property [baseUrl] - 基础URL（用于补全相对链接）
 * @returns 解析后的视频项目数组
 *
 * @example
 * // 使用默认选择器解析
 * const videos = await queryVideoElements(document);
 *
 * // 自定义选择器配置
 * const videos = await queryVideoElements(document, {
 *   element: '.video-item',
 *   title: '.title a',
 *   cover: '.poster img'
 * });
 */
this.queryVideoElements = async (
  body: Document,
  {
    element = '.bookbox',
    cover = 'img',
    coverHeaders = undefined,
    title = 'h3 a',
    intro = '.intro',
    releaseDate = '.year',
    country = '.area',
    duration = '.time',
    director = '.director',
    cast = '.actor',
    tags = '.tags',
    status = '.status',
    url = 'a',
    latestUpdate = '.update',
    coverDomain = undefined,
    baseUrl = undefined,
  },
): Promise<VideoItem[]> => {};
```

## 10. `queryPhotoElements`

获取图片元素列表。

```typescript
/**
 * 图片/照片项数据结构定义
 */
interface PhotoItem {
  /** 图片项唯一标识ID */
  id: string;

  /** 可选 - 图片标题（可为null） */
  title?: string | null;

  /** 可选 - 图片描述（可为null） */
  desc?: string | null;

  /** 图片封面URL（可以是单个URL或URL数组） */
  cover: string | string[];

  /** 可选 - 封面图片请求头（用于需要特殊认证的封面图，可为null） */
  coverHeaders?: Record<string, string> | null;

  /** 可选 - 作者/上传者信息（可为null） */
  author?: string | null;

  /** 可选 - 发布时间/日期（可为null） */
  datetime?: string | null;

  /** 可选 - 热度指标（可以是字符串或数字，可为null） */
  hot?: string | number | null;

  /** 可选 - 浏览数（可为null） */
  view?: number | null;

  /** 可选 - 详情页URL（可为null） */
  url?: string | null;

  /** 是否具有详情页（false表示有详情页，true表示无详情页） */
  noDetail?: boolean;

  /** 可选 - 扩展字段（用于存储任意额外数据，可为null） */
  extra?: any | null;

  /** 数据来源标识ID */
  sourceId: string;
}

/**
 * 从DOM文档中查询并提取图片元素信息
 * @param body - 包含图片列表的DOM文档对象
 * @param options - 配置对象，包含CSS选择器配置
 * @param options.element - 图片项容器元素选择器（默认：'.update_area_content'）
 * @param options.cover - 封面图片元素选择器（默认：'img'）
 * @param options.coverHeaders - 封面图片请求头选择器（用于特殊鉴权，默认：undefined）
 * @param options.title - 标题元素选择器（默认：'.title'）
 * @param options.desc - 描述元素选择器（默认：'.desc'）
 * @param options.author - 作者元素选择器（默认：'.author'）
 * @param options.datetime - 时间元素选择器（默认：'.datetime'）
 * @param options.hot - 热度元素选择器（默认：'.hot'）
 * @param options.view - 浏览数元素选择器（默认：'.view'）
 * @param options.url - 链接元素选择器（默认：'a'）
 * @param options.coverDomain - 封面图片域名（用于相对路径补全，默认：undefined）
 * @returns 返回解析后的图片项数组Promise
 *
 * @example
 * // 从页面文档中提取图片信息
 * const photos = await queryPhotoElements(document, {
 *   element: '.photo-item',
 *   title: '.photo-title',
 *   cover: '.cover-img'
 * });
 */
this.queryPhotoElements = async (
  body: Document,
  {
    element = '.update_area_content',
    cover = 'img',
    coverHeaders = undefined,
    title = '.title',
    desc = '.desc',
    author = '.author',
    datetime = '.datetime',
    hot = '.hot',
    view = '.view',
    url = 'a',
    coverDomain = undefined,
  },
): Promise<PhotoItem[]> => {};
```

## 11. `queryPlaylistElements`

获取歌单元素列表

```typescript
/**
 * 歌曲播放地址
 */
interface SongUrlMap {
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

/**
 * 歌曲信息接口
 */
interface SongInfo {
  /** 歌曲名称 */
  name?: string;

  /** 艺人信息（对象数组或名称数组） */
  artists?: ArtistInfo[] | string[];

  /** 歌曲唯一ID */
  id: string;

  /** 内容ID（平台特定） */
  cid?: string;

  /** 歌词内容 */
  lyric?: string;

  /** 专辑信息 */
  album?: AlbumInfo;

  /** MV ID */
  mvId?: string;

  /** MV内容ID */
  mvCid?: string;

  /** 播放URL（单个URL或映射） */
  playUrl?: string | SongUrlMap;

  /** 封面图片URL */
  picUrl?: string;

  /** 大尺寸封面URL */
  bigPicUrl?: string;

  /** 封面图片请求头 */
  picHeaders?: Record<string, string>;

  /** FLAC格式URL */
  flac?: string;

  /** 持续时间（毫秒） */
  duration?: number;

  /** 数据源ID */
  sourceId: string;

  /** 额外属性 */
  extra?: Record<string, string>;
}

/** 带分页的歌曲列表 */
interface SongList {
  /** 歌曲数组 */
  list: SongInfo[];

  /** 当前页码 */
  page: number;

  /** 每页数量 */
  pageSize?: number | null;

  /** 总页数 */
  totalPage?: number | null;
}

/**
 * 艺人信息接口
 */
interface ArtistInfo {
  /** 艺人名称 */
  name: string;

  /** 艺人ID */
  id: string;

  /** 艺人图片URL */
  picUrl?: string;

  /** 歌曲数量 */
  songCount?: string | number;

  /** MV数量 */
  mvCount?: number;

  /** 专辑数量 */
  albumCount?: string | number;
}

/**
 * 专辑信息接口
 */
interface AlbumInfo {
  /** 专辑名称 */
  name: string;

  /** 专辑ID */
  id: string;

  /** 专辑艺人（对象数组或名称数组） */
  artists?: ArtistInfo[] | string[];

  /** 专辑封面URL */
  picUrl?: string;

  /** 发布时间 */
  publishTime?: string;

  /** 描述 */
  desc?: string;

  /** 发行公司 */
  company?: string;

  /** 专辑歌曲列表 */
  songList?: SongList;

  /** 歌曲数量 */
  songCount?: string | number;

  /** 总时长（毫秒） */
  duration?: number;
}

/**
 * 歌单信息接口
 */
interface PlaylistInfo {
  /** 歌单名称 */
  name: string;

  /** 歌单ID */
  id: string;

  /** 歌单URL */
  url?: string;

  /** 封面图片URL */
  picUrl: string;

  /** 封面图片请求头 */
  picHeaders?: Record<string, string>;

  /** 歌曲数量 */
  songCount?: string | number;

  /** 播放次数 */
  playCount?: string | number;

  /** 描述 */
  desc?: string;

  /** 创建者信息 */
  creator?: {
    id?: string;
    name?: string;
  };

  /** 创建时间 */
  createTime?: string;

  /** 更新时间 */
  updateTime?: string;

  /** 总页数 */
  totalPage?: number;

  /** 歌曲列表 */
  list?: SongList;

  /** 数据源ID */
  sourceId: string;

  /** 额外属性 */
  extra?: Record<string, string>;
}

/**
 * 从DOM中查询歌单元素
 *
 * @param body - DOM文档对象
 * @param options - CSS选择器配置
 *        @property [element='.update_area_content'] - 歌单项容器
 *        @property [picUrl='img'] - 封面图片选择器
 *        @property [picHeaders=undefined] - 封面图片请求头
 *        @property [name='a[href]'] - 名称选择器
 *        @property [desc='.desc'] - 描述选择器
 *        @property [creator='.author'] - 创建者选择器
 *        @property [createTime='.datetime'] - 创建时间选择器
 *        @property [updateTime='.datetime'] - 更新时间选择器
 *        @property [url='a[href]'] - URL选择器
 *        @property [coverDomain] - 封面相对路径域名
 * @returns 解析后的歌单数组Promise
 *
 * @example
 * // Query playlist from document
 * const playlists = await this.queryPlaylistElements(document, {
 *   element: '.playlist-item',
 *   name: '.title a'
 * });
 */
async function queryPlaylistElements(
  body: Document,
  {
    element = '.update_area_content',
    picUrl = 'img',
    picHeaders = undefined,
    name = 'a[href]',
    desc = '.desc',
    creator = '.author',
    createTime = '.datetime',
    updateTime = '.datetime',
    url = 'a[href]',
    coverDomain = undefined,
  }: {
    element?: string;
    picUrl?: string;
    picHeaders?: Record<string, string>;
    name?: string;
    desc?: string;
    creator?: string;
    createTime?: string;
    updateTime?: string;
    url?: string;
    coverDomain?: string;
  } = {},
) {}
```

## 12. `querySongElements`

获取歌曲元素列表

```typescript
/**
 * 从DOM文档中查询歌曲元素
 *
 * @param body - 要查询的DOM文档对象
 * @param options - CSS选择器配置对象
 *        @property [element='.update_area_content'] - 歌曲项的容器选择器
 *        @property [picUrl='img'] - 歌曲封面图片选择器
 *        @property [picHeaders=undefined] - 歌曲封面图片请求头
 *        @property [name='a[title]'] - 歌曲名称选择器（优先title属性）
 *        @property [artists='.artist'] - 艺人信息选择器
 *        @property [duration='.duration'] - 歌曲时长选择器
 *        @property [url='a[href]'] - 歌曲详情页URL选择器
 *        @property [playUrl='.play-url'] - 直接播放URL选择器
 *        @property [lyric='.lyric'] - 歌词内容/URL选择器
 *        @property [coverDomain] - 用于补全相对封面路径的域名
 * @returns 返回解析后的歌曲信息数组的Promise
 *
 * @example
 * // Basic usage
 * const songs = await this.querySongElements(document);
 *
 * @example
 * // Custom selector configuration
 * const songs = await this.querySongElements(document, {
 *   element: '.song-item',
 *   name: '.song-title',
 *   artists: '.singer-name'
 * });
 */
async function querySongElements(
  body: Document,
  {
    element = '.update_area_content',
    picUrl = 'img',
    picHeaders = undefined,
    name = 'a[title]',
    artists = '.artist',
    duration = '.duration',
    url = 'a[href]',
    playUrl = '.play-url',
    lyric = '.lyric',
    coverDomain = undefined,
  }: {
    element?: string;
    picUrl?: string;
    picHeaders?: Record<string, string>;
    name?: string;
    artists?: string;
    duration?: string;
    url?: string;
    playUrl?: string;
    lyric?: string;
    coverDomain?: string;
  } = {},
) {}
```

## 13. `queryChapters`

获取书籍/漫画的章节列表

```typescript
/**
 * 书籍/漫画章节信息接口
 */
export interface BookChapter {
  /** 章节唯一ID */
  id: string;

  /** 章节标题 */
  title: string;

  /** 可选 - 章节内容页URL */
  url?: string;

  /** 可选 - 阅读进度页码 */
  readingPage?: number;
}

/**
 * 从DOM文档中查询章节列表
 *
 * @param body - 包含章节列表的DOM文档对象
 * @param options - 查询配置项
 *        @property [element='.chapter_list a'] - 章节元素选择器（默认查找章节列表下的链接元素）
 * @returns 返回解析后的章节信息数组Promise
 *
 * @example
 * // 基本用法
 * const chapters = await this.queryChapters(document);
 *
 * @example
 * // 自定义选择器
 * const chapters = await this.queryChapters(document, {
 *   element: '.chapter-item > a'
 * });
 */
this.queryChapters = async (
  body: Document,
  { element = '.chapter_list a' } = {},
): Promise<Chapter[]> => {};
```

# 14. `getContentText`

获取小说阅读页面的文本内容

```typescript
/**
 * 递归获取HTML元素及其子元素的纯文本内容
 *
 * @param element - 要提取文本的HTML元素（可选）
 * @returns 返回拼接后的纯文本内容，已去除首尾空白字符
 *
 * @description
 * 该方法会深度遍历元素的所有子节点：
 * 1. 对文本节点(TEXT_NODE)直接获取内容
 * 2. 对元素节点(ELEMENT_NODE)递归调用自身
 * 3. 每个节点内容后添加换行符
 * 4. 最后对结果执行trim()清理首尾空格
 *
 * @example
 * // 获取div元素内的纯文本
 * const text = this.getContentText(document.querySelector('.content'));
 *
 * @example
 * // 空元素调用返回空字符串
 * this.getContentText(); // => ""
 */
this.getContentText = (element?: HTMLElement) => {};
```

## 15. `nanoid`

`nanoid` 是一个用于生成随机字符串的工具库。

> 使用方法

```javascript
const id = this.nanoid();
```

## 16. `urlJoin`

`urlJoin` 是一个用于拼接 URL 的工具函数。

```typescript
this.urlJoin = (...parts: (string | null | undefined)[]): string => {};
```

## 17. `maxPageNoFromElements`

从页面元素列表中获取最大页码数

```typescript
function maxPageNoFromElements(
  elements?: NodeListOf<Element> | null,
  onlyKeepNumbers = true, // 是否主动移除非数字字符
): number | null {}
```

## 18. `getM3u8ProxyUrl`

`getM3u8ProxyUrl` 是一个用于获取 M3U8 代理 URL 的工具函数。

```typescript
const proxyUrl = await this.getM3u8ProxyUrl(url, { referer: url });
```

## 19. `m3u8Parser`

`m3u8Parser` 是一个 m3u8Parser 库的默认导出,用于处理 M3U8 内容。

```typescript
const parser = new this.m3u8Parser.Parser();
parser.push(text);
parser.end();
const resources = {};
for (const segment of parser.manifest.segments) {
  ...
}
```

## 20. `log`

使用 `log` 进行日志打印。

```typescript
this.log('this is a log');
```

## END
