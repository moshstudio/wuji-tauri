# 无极（wuji-tauri）源开发指南

> 本文档基于 `packages/source-extension` 与项目内置「制作源」向导整理。  
> 后续你提供**目标网站 URL**、**抓包/API 信息**或**其他阅读/音乐/影视软件的源规则**时，可配合本文档生成完整源代码。

---

## 1. 核心概念

### 1.1 源是什么

源是一段 **JavaScript 类代码字符串**，运行时通过 `new Function` 动态加载。每个源继承对应类型的基类（如 `BookExtension`），实现若干抽象方法，负责：

- 拉取列表（推荐 / 搜索）
- 拉取详情（章节、集数、歌单歌曲等）
- 拉取内容（正文、图片、播放地址、歌词等）

代码最终形态示例：

```javascript
class CustomBookExtension extends BookExtension {
  id = 'my_source_id';      // 唯一标识，英文/数字
  name = '我的书源';         // 显示名称
  version = '1.0.0';        // 版本号（视频/CMS 建议填写）

  constructor() {
    super();
    this.baseUrl = 'https://example.com/';
  }

  async getRecommendBooks(pageNo, type) { /* ... */ }
  async search(keyword, pageNo) { /* ... */ }
  async getBookDetail(item) { /* ... */ }
  async getContent(item, chapter) { /* ... */ }
}

return CustomBookExtension;  // 必须 return 类，不能省略
```

### 1.2 五种源类型

| 类型 | 基类 | 加载函数 | 典型场景 |
|------|------|----------|----------|
| 书籍 `book` | `BookExtension` | `loadBookExtensionString` | 网络小说 |
| 漫画 `comic` | `ComicExtension` | `loadComicExtensionString` | 在线漫画 |
| 图片 `photo` | `PhotoExtension` | `loadPhotoExtensionString` | 图库/相册 |
| 音乐 `song` | `SongExtension` | `loadSongExtensionString` | 在线音乐 |
| 视频 `video` | `VideoExtension` 或 `CmsVideoExtension` | `loadVideoExtensionString` | 影视站点 / 苹果 CMS |

### 1.3 运行时约定

- 应用调用的是 `exec*` 包装方法（如 `execSearch`），内部会：补全 `id`/`sourceId`、空关键词回退到推荐列表、捕获异常返回 `null`。
- **你只需实现抽象方法**（如 `search`），不必实现 `execSearch`。
- `sourceId` 由框架自动填充，手写时可留空字符串 `''`。
- `id` + `name` + `version` 的 MD5 为源 `hash`，用于去重。
- 书籍正文经 `purifyText` 清洗；视频 `getPlayUrl` 若返回带 `headers` 的地址，框架会自动走代理。

### 1.4 数据获取三件套

| 方法 | 适用场景 |
|------|----------|
| `this.fetch(url, options)` | 调 API、下载原始 HTML/JSON；支持跨域、`verify: false`、`noProxy` |
| `this.fetchDom(url, init?, domType?, encoding?)` | 请求后自动解码（支持 `gbk`）并解析为 `Document` |
| `this.fetchWebview(url, options?)` | 需要 JS 渲染、Cookie、或嗅探 m3u8/音视频时使用 |

`fetchWebview` 返回的 Document 额外属性：

- `document.cookie` / `document.URL` — 页面真实 cookie 与地址
- `document._sniffedResources` — 嗅探到的 video/audio/image/xhr 等资源

```javascript
const doc = await this.fetchWebview(playPageUrl, {
  waitForResources: 'video',  // 等待 m3u8 等出现
  timeout: 30,
  useSavedCookie: true,
});
const videos = doc._sniffedResources.filter(r => r.resourceType === 'video');
```

---

## 2. 基类可用工具一览

在 `constructor() { super(); }` 之后，实例上可使用：

| 成员 | 用途 |
|------|------|
| `this.baseUrl` | 站点根地址，配合 `this.urlJoin(...)` 拼相对路径 |
| `this.fetch` / `this.fetchDom` / `this.fetchWebview` | 网络与页面获取 |
| `this.queryBookElements(doc, selectors)` | 从 DOM 批量解析书籍列表 |
| `this.queryComicElements(doc, selectors)` | 漫画列表（参数同书籍） |
| `this.queryVideoElements(doc, selectors)` | 影视列表 |
| `this.queryPhotoElements(doc, selectors)` | 图片列表 |
| `this.queryPlaylistElements(doc, selectors)` | 歌单列表 |
| `this.querySongElements(doc, selectors)` | 歌曲列表 |
| `this.queryChapters(doc, { element })` | 章节链接列表 |
| `this.getContentText(element)` | 递归提取 HTMLElement 纯文本（小说正文） |
| `this.maxPageNoFromElements(nodeList)` | 从分页 DOM 取最大页码 |
| `this.urlJoin(...parts)` | 智能拼接 URL |
| `this.getProxyUrl(url, headers?)` | 媒体代理（mp4 等） |
| `this.getM3u8ProxyUrl(url, headers?)` | M3U8 代理 |
| `this.cryptoJs` | CryptoJS（MD5/AES 等） |
| `this.forge` | node-forge 加解密 |
| `this.iconv` | GBK 等编码转换 |
| `this.m3u8Parser` | 解析 m3u8 清单 |
| `this.pLimit(n)` | 限制并发（防封） |
| `this._` | lodash |
| `this.nanoid()` / `this.uuid` | 生成 ID |
| `this.log(...)` | 日志 |

### 2.1 列表解析选择器（query*Elements）

以书籍为例，传入 CSS 选择器映射：

```javascript
await this.queryBookElements(document, {
  element: '.book-item',        // 每一项容器
  cover: 'img',                 // 封面
  coverHeaders: { Referer: '...' }, // 可选，封面鉴权
  title: 'h3 a',
  intro: '.intro',
  author: '.author',
  tags: '.tag',
  status: '.status',
  url: 'a',                     // 详情链接
  latestChapter: '.latest a',
  latestUpdate: '.update',
  coverDomain: 'https://cdn.example.com', // 封面 CDN 根
});
```

封面会自动识别 `data-src`、`data-original`、`lazy-src` 及 `background-image`。

### 2.2 分页列表返回格式

```typescript
{
  list: Item[],
  page: number,           // 当前页
  totalPage?: number,     // 总页数
  pageSize?: number,
  type?: string,          // 分类 Tab 名称（多分类时使用）
}
```

---

## 3. 各类型必须实现的方法

### 3.1 书籍 `BookExtension`

| 方法 | 说明 |
|------|------|
| `getRecommendBooks(pageNo?, type?)` | 首页推荐；支持多分类 Tab |
| `search(keyword, pageNo?)` | 搜索 |
| `getBookDetail(item)` | 填充 `item.chapters` |
| `getContent(item, chapter)` | 返回章节**纯文本**字符串 |

**类型：**

```typescript
interface BookItem {
  id: string; title: string; intro?: string; cover?: string;
  author?: string; tags?: string[] | string; status?: string;
  url?: string; chapters?: { id: string; title: string; url?: string }[];
  sourceId: string;
}
type BooksList = BookList | BookList[];  // 单列表或多 Tab 列表数组
```

**多分类 Tab 模式**（书籍/漫画/视频通用）：

```javascript
async getRecommendBooks(pageNo, type) {
  const tabs = [
    { name: '玄幻', path: 'xuanhuan' },
    { name: '仙侠', path: 'xianxia' },
  ];
  // 首次进入：只返回分类，list 为空
  if (!type) {
    return tabs.map(t => ({ type: t.name, list: [], page: pageNo || 1 }));
  }
  const tab = tabs.find(t => t.name === type);
  const doc = await this.fetchDom(`${this.baseUrl}${tab.path}/page/${pageNo}`);
  return {
    type,
    list: await this.queryBookElements(doc, { /* ... */ }),
    page: pageNo,
    totalPage: this.maxPageNoFromElements(doc.querySelectorAll('.page a')),
  };
}
```

**正文提取要点：**

- 优先 `this.getContentText(document.querySelector('#content'))`
- 章节有「下一页」时需循环拼接（见 `BOOK_CONTENT` 模板）
- API 源直接返回 `json.data.content`

---

### 3.2 漫画 `ComicExtension`

| 方法 | 说明 |
|------|------|
| `getRecommendComics(pageNo?, type?)` | 推荐列表 |
| `search(keyword, pageNo?)` | 搜索 |
| `getComicDetail(item)` | 章节列表 |
| `getContent(item, chapter)` | 返回 **`ComicContent`**（图片 URL 数组） |

```typescript
interface ComicContent {
  photos: string[];                    // 本章所有图片 URL
  photosHeaders?: Record<string, string> | null;  // 看图鉴权 Referer 等
  page: number;
  totalPage?: number | null;         // 漫画内容不再分页，通常 page=1, totalPage=1
}
```

漫画与书籍结构相似，区别仅在 `getContent` 返回图片列表而非文本。注意解密脚本、API 签名等逻辑写在此方法内。

---

### 3.3 图片 `PhotoExtension`

| 方法 | 说明 |
|------|------|
| `getRecommendList(pageNo?)` | 推荐图集 |
| `search(keyword, pageNo?)` | 搜索 |
| `getPhotoDetail(item, pageNo?)` | 图集内图片列表（支持分页） |

```typescript
interface PhotoDetail {
  item: PhotoItem;
  photos: string[];
  photosHeaders?: Record<string, string> | null;
  page: number;
  totalPage?: number | null;
}
```

- `PhotoItem.cover` 可为单 URL 或 URL 数组（列表页直接展示多图时）
- `noDetail: true` 表示无详情页，列表即全部内容

---

### 3.4 音乐 `SongExtension`

| 方法 | 说明 |
|------|------|
| `getRecommendPlaylists(pageNo?)` | 推荐歌单 |
| `getRecommendSongs(pageNo?)` | 推荐单曲 |
| `searchPlaylists(keyword, pageNo?)` | 搜索歌单 |
| `searchSongs(keyword, pageNo?)` | 搜索歌曲 |
| `getPlaylistDetail(item, pageNo?)` | 歌单内歌曲，`item.list` 填充歌曲 |
| `getSongUrl(item, size?)` | 播放地址，`size`: `'128k'|'320k'|'flac'|''` |
| `getLyric(item)` | 歌词（可返回 `null`，部分源歌词在 `getSongUrl` 里一并返回） |

```typescript
interface SongUrlMap {
  '128k'?: string; '320k'?: string; 'flac'?: string;
  lyric?: string; lyricUrl?: string;
  headers?: Record<string, string>;
}
// getSongUrl 可返回 string | SongUrlMap | null
```

**关键字段：**

- `SongInfo.id` — 歌曲 ID
- `SongInfo.cid` — 版权/内容 ID（部分平台播放入参）
- `PlaylistInfo.extra` — 可存平台特有字段（如咪咕 `userId`、`type`）

---

### 3.5 视频 `VideoExtension`（自定义爬虫）

| 方法 | 说明 |
|------|------|
| `getRecommendVideos(pageNo?, type?)` | 推荐（支持多 Tab） |
| `search(keyword, pageNo?)` | 搜索 |
| `getVideoDetail(item)` | 填充 `item.resources` |
| `getPlayUrl(item, resource, episode)` | 返回 `VideoUrlMap` |

```typescript
interface VideoResource {
  id: string; title: string;           // 如「蓝光」「线路1」
  episodes?: { id: string; title: string; url?: string }[];
}
interface VideoUrlMap {
  url: string;
  headers?: Record<string, string> | null;
  type?: 'm3u8' | 'mp4' | 'hls' | 'dash' | 'rtmp';
  isLive?: boolean;
}
```

**详情页结构：** 一部影片 → 多个 `resources`（播放源）→ 每个源下多个 `episodes`（集数）。

**播放地址获取常见手段：**

1. 详情页已含 m3u8/mp4 → `getPlayUrl` 直接返回 `episode.url`
2. 播放页 iframe + script 正则提取
3. `fetchWebview` + `_sniffedResources` 嗅探 m3u8
4. 二次 API 请求

`getPlayUrl` 中若自行设置 `headers`，`execGetPlayUrl` 会自动代理；也可在返回前手动调用 `getM3u8ProxyUrl`。

---

### 3.6 视频 `CmsVideoExtension`（苹果 CMS V10）

**适用：** 目标站提供标准苹果 CMS 接口，形如：

`https://域名/api.php/provide/vod?ac=detail&pg=1`

只需继承 `CmsVideoExtension` 并配置少量字段，**列表/搜索/详情/播放 URL 已由基类实现**：

```javascript
class MyCmsSource extends CmsVideoExtension {
  id = 'cms_demo';
  name = '示例CMS';
  version = '1.0.0';

  constructor() {
    super();
    this.baseUrl = 'https://example.com/api.php/provide/vod';
    this.proxyHeaders = {
      Referer: 'https://example.com/',
      'User-Agent': 'Mozilla/5.0 ...',
    };
  }
}

return MyCmsSource;
```

**可覆盖的基类属性：**

| 属性 | 默认 | 说明 |
|------|------|------|
| `pageSize` | 20 | 每页条数 |
| `filterSensitiveTypes` | true | 过滤敏感分类 Tab |
| `sensitiveTypeKeywords` | 伦理/福利等 | 自定义过滤词 |
| `proxyHeaders` | — | m3u8/mp4 代理请求头 |

**CMS API 参数约定：**

| ac | 用途 | 常用参数 |
|----|------|----------|
| `list` | 获取分类 | — |
| `detail` | 列表/详情 | `pg`, `t`(分类id), `wd`(搜索词), `ids`(视频id) |

**播放地址格式（vod_play_from / vod_play_url）：**

```
来源1$$$来源2
第1集$url1#第2集$url2$$$第1集$url1#第2集$url2
```

判断是否 CMS：浏览器访问 `baseUrl?ac=list`，若返回 JSON 含 `list`、`class`、`pagecount` 即为 CMS。

---

## 4. 完整代码模板结构

项目内模板位于 `src/components/codeEditor/templates/*.txt`，生成逻辑见 `createSource/utils.ts`。

**类内成员顺序：** 字段与 `constructor` → `_` 开头的辅助函数 → 对外抽象方法。

### 4.1 书籍

```
constructor → _helpers… → getRecommendBooks → search → getBookDetail → getContent
```

### 4.2 漫画

```
constructor → _helpers… → getRecommendComics → search → getComicDetail → getContent
```

### 4.3 图片

```
constructor → _helpers… → getRecommendList → search → getPhotoDetail
```

### 4.4 音乐

```
constructor → _helpers… → getRecommendPlaylists → getRecommendSongs → searchPlaylists
→ searchSongs → getPlaylistDetail → getSongUrl → getLyric
```

### 4.5 视频（自定义）

```
constructor → _helpers… → getRecommendVideos → search → getVideoDetail → getPlayUrl
```

### 4.6 视频（CMS）

```
constructor（baseUrl + proxyHeaders）
→ 其余方法由 CmsVideoExtension 提供，模板中占位符可留空或注释说明
```
---

## 5. 从外部信息逆向制作源的流程

当你提供网址或其他软件规则时，按以下步骤分析：

### 5.1 确定源类型

| 目标内容 | 类型 |
|----------|------|
| 小说文字章节 | book |
| 漫画图片章节 | comic |
| 图库/套图 | photo |
| 音乐/歌单 | song |
| 影视剧集 | video（先判断是否 CMS） |

### 5.2 识别数据形态

```
┌─ 标准 REST/JSON API ──→ this.fetch + JSON 映射
├─ 静态 HTML 列表 ──────→ this.fetchDom + query*Elements
├─ 需要登录/JS 渲染 ────→ this.fetchWebview
├─ 播放地址在网络请求 ──→ fetchWebview 嗅探 或 抓包还原 API
└─ 苹果 CMS 影视站 ─────→ CmsVideoExtension（最省事）
```

### 5.3 需要收集的信息清单

请尽量提供：

1. **站点首页 / 分类页 / 搜索页 URL 规律**（含分页参数）
2. **详情页 URL 样例**
3. **章节/集数列表** 在 HTML 中的位置，或 API 响应 JSON 样例
4. **正文/图片/播放地址** 获取方式（含是否加密、是否多页）
5. **必要请求头**（User-Agent、Referer、Cookie、自定义 sign）
6. **编码**（是否 GBK）
7. **其他软件源规则**（如 legado 书源、TVBox 源、苹果 CMS 地址）— 可翻译为本项目对应方法

### 5.4 与其他软件规则的对照

| 外部格式 | 本项目对应 |
|----------|------------|
| Legado 书源 `ruleSearch` / `ruleBookInfo` / `ruleContent` | `search` / `getBookDetail` / `getContent` |
| 阅读类 `exploreUrl` + 分类 | `getRecommendBooks` 多 Tab |
| TVBox / 影视仓 `api` CMS 地址 | `CmsVideoExtension` + `baseUrl` |
| TVBox 爬虫型 `ext` JS | `VideoExtension` 各方法 |
| 漫画阅读器 API 规则 | `getContent` 返回 `photos[]` |

### 5.5 常见坑

- 相对路径必须用 `this.urlJoin(this.baseUrl, href)` 处理
- 封面/图片 CDN 需 `coverHeaders` / `photosHeaders` 带 Referer
- GBK 站点：`this.fetchDom(url, {}, 'text/html', 'gbk')`
- 搜索 POST + session：在 `constructor` 用 `this.searchIds = {}` 缓存 searchId
- 漫画/小说章节 ID：优先用稳定值（URL 或平台 chapter_id），避免纯标题
- `fetchWebview` 并发默认限制 5，大量章节用 `this.pLimit(1)` 包裹
- 歌曲 `duration` 单位为**毫秒**
- 视频多播放源时过滤无效线路（如无集数的、纯广告源）

---

## 6. 默认示例参考

内置向导默认代码见 `src/components/codeEditor/templates.ts`：

| 类型 | 示例站点思路 |
|------|-------------|
| photo | 图库 DOM 解析 |
| song | 咪咕音乐 API |
| book | 酷我小说 API |
| comic | 漫画站多 Tab + DOM |
| video | 影视站 DOM + 播放页 script 提取 |
| video CMS | 仅需 `baseUrl` 指向 CMS API |

更细的 API/类型说明见 `src/components/codeEditor/guides/*.md`。

---

## 7. 交付物格式

生成的源代码应：

1. 是一个完整可执行字符串（含 `return CustomXxxExtension`）
2. `id` 英文唯一；`name` 中文可读；`version` 建议 semver
3. `constructor` 中设置 `this.baseUrl` 及公共 `this.headers`
4. 每个方法可独立运行、错误时返回 `null` 而非抛异常（框架也会兜底）
5. 列表项至少包含可点击的 `title`/`name` + `url` 或 `id`
6. **代码简洁规范**：避免冗长注释与无用中间变量；命名清晰；逻辑直达目的
7. **`_` 开头的辅助函数放在前面**：写在 `constructor` 之后、对外抽象方法之前；公共解析/URL/清洗逻辑抽成 `_xxx`，勿散落在各方法末尾
---

## 8. 给 AI 的速查提示（你下次发消息时可附带）

```
请根据 SOURCE_DEVELOPMENT_GUIDE.md，为以下目标生成 [book|comic|photo|song|video] 源代码：

- 目标网站/API：
- 是否为苹果 CMS：（仅 video）
- 参考的其他软件源规则：（如有）
- 抓包/JSON 样例：（如有）
- 特殊要求：（登录、仅搜索、过滤分类等）

输出完整 JS 类代码，以 return CustomXxxExtension 结尾。
要求：代码简洁规范；_ 开头辅助函数放在 constructor 之后、对外方法之前。
```

---

## 9. 相关源码索引

| 路径 | 内容 |
|------|------|
| `packages/source-extension/src/baseExtension.ts` | 基类与 query* 工具实现 |
| `packages/source-extension/src/book/index.ts` | 书籍抽象方法 |
| `packages/source-extension/src/comic/index.ts` | 漫画抽象方法 |
| `packages/source-extension/src/photo/index.ts` | 图片抽象方法 |
| `packages/source-extension/src/song/index.ts` | 音乐抽象方法 |
| `packages/source-extension/src/video/index.ts` | 视频抽象方法 |
| `packages/source-extension/src/video/cms.ts` | 苹果 CMS 适配器 |
| `packages/source-extension/src/utils/webview.ts` | fetchWebview 封装 |
| `src/components/codeEditor/guides/common.md` | 通用 API 文档（应用内向导） |
| `src/components/codeEditor/templates.ts` | 各类型默认实现片段 |
| `src/layouts/desktop/source/createSource/utils.ts` | 代码拼接与校验 |

---

*文档版本：与仓库 `packages/source-extension` 同步，生成日期 2026-06-25*
