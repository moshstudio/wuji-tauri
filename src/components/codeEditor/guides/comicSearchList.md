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

// 抽象方法：获取搜索漫画
// 参数：
//   keyword - 关键词
//   pageNo - 页码（可选）
// 返回值：
//   ComicList 漫画列表 (搜索无需返回ComicList[])
abstract search(keyword: string, pageNo?: number): Promise<ComicsList | null>;
```

## 从DOM获取元素

```javascript
async function search(keyword, pageNo) {
  pageNo ||= 1;
  const url = `https://so.77mh.nl/k.php?k=${keyword}&p=${pageNo}`;
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
  const pageElement = body.querySelector('.pages_s span');
  const totalPage = Number(pageElement?.textContent?.split('/').pop());

  return {
    list,
    page: pageNo,
    totalPage,
  };
}
```

## 从api获取元素

```javascript
async function search(keyword, pageNo) {
  pageNo ||= 1;
  const url = `${this.baseUrl}api/v1/comic1/search`;
  const params = new URLSearchParams({
    keyword,
    page: pageNo,
    size: 20,
  });

  const response = await this.fetch(`${url}?${params.toString()}`);
  const json = await response.json();

  const list = json.data.comic_list.map((item) => {
    return {
      id: item.id,
      title: item.name,
      cover: item.cover,
      author: item.authors,
      status: item.status,
      latestChapter: item.last_update_chapter_name,
      extra: { comicPy: item.comic_py },
      sourceId: '',
    };
  });
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(json.data.total / 20),
  };
}
```
