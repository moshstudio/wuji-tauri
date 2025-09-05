## 函数定义

```typescript
// 书籍章节
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

/**
 * 抽象方法 - 获取漫画章节详情
 * @param item 漫画对象（必传）
 * @returns 返回原漫画对象
 */
abstract getComicDetail(item: ComicItem): Promise<ComicItem | null>;
```

## 从DOM获取元素

```javascript
async function getComicDetail(item) {
  pageNo ||= 1;
  const body = await this.fetchDom(item.url);
  const chapters = await this.queryChapters(body, {
    element: '.ar_list_col a',
  });
  item.chapters = chapters.reverse();
  return item;
}
```

## 从api获取元素

```javascript
async function getComicDetail(item) {
  pageNo ||= 1;
  const url = `${this.baseUrl}api/v1/comic1/comic/detail`;
  const params = new URLSearchParams({
    channel: 'pc',
    app_name: 'dmzj',
    version: '1.0.0',
    timestamp: `${Date.now()}`,
    comic_py: `${item.extra.comicPy}`,
  });
  const response = await this.fetch(`${url}?${params.toString()}`);
  const json = await response.json();

  item.intro = json.data.comicInfo.description;
  const chapters = json.data.comicInfo.chapterList?.[0]?.data.map((item) => {
    return {
      id: item.chapter_id,
      title: item.chapter_title,
    };
  });
  item.chapters = chapters?.reverse();
  return item;
}
```
