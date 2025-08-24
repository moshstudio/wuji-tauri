## 函数定义

```typescript
export interface ComicContent {
    photos: string[];
    photosHeaders?: Record<string, string> | null;
    page: number;
    pageSize?: number | null;
    totalPage?: number | null;
    extra?: any | null;
}
export interface ComicChapter {
    id: string;
    title: string;
    url?: string;
    readingPage?: number;
}
export type ChapterList = ComicChapter[];
export interface ComicItem {
    id: string;
    title: string;
    intro?: string;
    cover?: string;
    coverHeaders?: Record<string, string> | null;
    author?: string;
    tags?: string[] | string;
    status?: string;
    latestChapter?: string | ComicChapter;
    latestUpdate?: string;
    url?: string;
    chapters?: ChapterList;
    extra?: any;
    sourceId: string;
}
export interface ComicList {
    id?: string;
    list: ComicItem[];
    page: number;
    pageSize?: number | null;
    totalPage?: number | null;
    type?: string;
}
export type ComicsList = ComicList | ComicList[];

// 抽象方法：获取推荐漫画
// 参数：
//   pageNo - 页码（可选）
//   type - 漫画类型（当有多个漫画列表时需要传入）
// 返回值：
//   Promise包装的ComicsList对象或null（获取失败时返回null）
//   当有多个类型的漫画列表时，不传type返回type列表(ComicList[])，传type返回此type的漫画列表(ComicList)
//   如果无需type分类, 可直接返回漫画列表(ComicList)
abstract getRecommendComics(pageNo?: number, type?: string): Promise<ComicsList | null>;
```

## 从DOM获取元素

```javascript
async function getRecommendComics(pageNo, type) {
  let items = [
    {
      name: '热血机甲',
      category: 'rexue',
    },
    {
      name: '科幻未来',
      category: 'kehuan',
    },
  ];
  if (!type) {
    return items.map((item) => ({
      type: item.name,
      list: [],
      page: pageNo,
      totalPage: 1,
      sourceId: '',
    }));
  }
  const item = items.find((item) => item.name === type);
  if (!item) return null;
  pageNo = pageNo || 1;
  const url =
    pageNo === 1
      ? `${this.baseUrl}${item.category}/index.html`
      : `${this.baseUrl}${item.category}/index_${pageNo}.html`;
  const body = await this.fetchDom(url);
  const list = await this.queryComicElements(body, {
    element: '.main_left dl',
    cover: 'img',
    title: 'h1 a',
    intro: '.info',
    author: '.author a',
    status: '.status a',
    url: 'h1 a',
  });
  const pageElements = body.querySelectorAll('.pages_s a');
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}
```

## 从api获取元素

```javascript
async function getRecommendComics(pageNo, type) {
  let items = [
    {
      name: '少年',
      tag: '3262',
      theme: '0',
    },
    {
      name: '少女',
      tag: '3263',
      theme: '0',
    },
    {
      name: '青年',
      tag: '3264',
      theme: '0',
    },
    {
      name: '搞笑',
      tag: '0',
      theme: '1',
    },
    {
      name: '科幻',
      tag: '0',
      theme: '2',
    },
    {
      name: '魔法',
      tag: '0',
      theme: '3',
    },
    {
      name: '热血',
      tag: '0',
      theme: '4',
    },
    {
      name: '冒险',
      tag: '0',
      theme: '5',
    },
  ];
  if (!type) {
    return items.map((item) => ({
      type: item.name,
      list: [],
      page: pageNo,
      totalPage: 1,
      sourceId: '',
    }));
  }
  const item = items.find((item) => item.name === type);
  if (!item) return null;
  pageNo = pageNo || 1;
  const url = `${this.baseUrl}api/v1/comic1/rank_list`;
  const params = new URLSearchParams({
    channel: 'pc',
    app_name: 'dmzj',
    version: '1.0.0',
    timestamp: `${Date.now()}`,
    page: `${pageNo}`,
    size: '10',
    duration: '1',
    cate: '0',
    tag: `${item.tag}`,
    theme: `${item.theme}`,
  });
  const response = await this.fetch(url + '?' + params.toString());
  const json = await response.json();
  const list = json.data.list.map((item) => {
    return {
      id: item.comic_id,
      title: item.title,
      intro: item.description,
      cover: item.cover,
      author: item.authors,
      tags: item.types,
      status: item.status,
      latestChapter: item.last_update_chapter_name,
      extra: { comicPy: item.comic_py },
      sourceId: '',
    };
  });
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(json.data.totalNum / 10),
  };
}
```
