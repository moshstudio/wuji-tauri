## 函数定义

```typescript
// 书籍章节
export interface BookChapter {
    id: string;
    title: string;
    url?: string;
    readingPage?: number;
}
// 章节列表
export type ChapterList = BookChapter[];
//书籍
export interface BookItem {
    id: string;
    title: string;
    intro?: string;
    cover?: string;
    coverHeaders?: Record<string, string>;
    author?: string;
    tags?: string[] | string;
    status?: string;
    latestChapter?: string | BookChapter;
    latestUpdate?: string;
    url?: string;
    chapters?: ChapterList;
    extra?: any;
    sourceId: string;
}
// 书籍列表
export interface BookList {
    id?: string;
    list: BookItem[];
    page: number;
    pageSize?: number | null;
    totalPage?: number | null;
    type?: string;
}
// 书籍列表或多个书籍列表
export type BooksList = BookList | BookList[];

/**
 * 抽象方法 - 获取书籍章节详情
 * @param item 书籍对象（必传）
 * @returns 返回原书籍对象
 */
abstract getBookDetail(item: BookItem): Promise<BookItem | null>;
```

## 从DOM获取元素

```javascript
async function getBookDetail(item) {
  const chapters = [];
  let url = item.url;
  const document = await this.fetchDom(url);
  let elements = Array.from(document.querySelectorAll('.chapterList div:nth-child(4) a').values());
  if (!elements.length) {
    elements = Array.from(document.querySelectorAll('.chapListBody a').values());
  }
  elements.forEach((element) => {
    const chapter = {
      title: element.textContent.trim(),
      url: this.urlJoin(URL.parse(item.url).origin, element.getAttribute('href')),
    };
    chapters.push(chapter);
  });
  let pageNums = document.querySelectorAll('.select option').length;
  if (!pageNums) {
    pageNums = document.querySelectorAll('.dropDown li').length;
  }
  for (let i = 2; i <= pageNums; i++) {
    const url = `${URL.parse(item.url).origin}/index.php?action=loadChapterPage`;
    const form = new FormData();
    form.append('page', i);
    form.append('id', item.url.split('/').pop().replace('.html', ''));
    const response = await this.fetch(url, { method: 'POST', body: form });
    (await response.json()).data.forEach((chapter) => {
      const chapterItem = {
        title: chapter.chaptername,
        url: URL.parse(item.url).origin + chapter.chapterurl,
      };
      chapters.push(chapterItem);
    });
  }
  item.chapters = chapters;
  return item;
}
```

## 从api获取元素

```javascript
async function getBookDetail(item) {
  const url = this.urlJoin(this.baseUrl, `novels/api/book/${item.id}/chapters?paging=0`);
  const response = await this.fetch(url);
  const json = await response.json();

  if (json.code != 200) return item;

  const chapters = [];
  json.data.forEach((c) => {
    chapters.push({
      id: c.chapter_id,
      title: c.chapter_title,
    });
  });
  item.chapters = chapters;

  return item;
}
```
