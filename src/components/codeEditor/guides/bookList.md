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

// 抽象方法：获取推荐书籍
// 参数：
//   pageNo - 页码（可选）
//   type - 书籍类型（当有多个书籍列表时需要传入）
// 返回值：
//   Promise包装的BooksList对象或null（获取失败时返回null）
//   当有多个类型的书籍列表时，不传type返回type列表(BookList[])，传type返回此type的书籍列表(BookList)
//   如果无需type分类, 可直接返回书籍列表(BookList)
abstract getRecommendBooks(pageNo?: number, type?: string): Promise<BooksList | null>;
```

## 从DOM获取元素

```javascript
async function getRecommendBooks(pageNo, type) {
  let items = [
    {
      name: '玄幻',
      tag: `list-4-{pageNo}/`,
    },
    {
      name: '仙侠',
      tag: `list-7-{pageNo}/`,
    },
  ];
  if (!type) {
    return items.map((item) => ({
      id: item.tag,
      type: item.name,
      list: [],
      page: pageNo,
      sourceId: '',
    }));
  }
  const item = items.find((item) => item.name === type);
  if (!item) return null;
  pageNo = pageNo || 1;
  let url = `${this.baseUrl}${item.tag.replace('{pageNo}', pageNo)}`;
  const document = await this.fetchDom(url);
  const list = await this.queryBookElements(document, {
    element: '.mainCate li',
    cover: 'img',
    title: '.name a',
    author: '.author',
    intro: '.intro',
    url: '.name a',
  });
  const pageElements = document.querySelectorAll('.page a[href]');

  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
    type: item.name,
    sourceId: '',
  };
}
```

## 从api获取元素

```javascript
async function getRecommendBooks(pageNo, type) {
  pageNo = pageNo || 1;
  const url = this.urlJoin(this.baseUrl, `novels/api/book/search?keyword=玄幻&pi=${pageNo}&ps=30`);
  const response = await this.fetch(url);

  const json = await response.json();

  if (json.code != 200) return;

  const list = [];
  json.data.forEach((b) => {
    list.push({
      id: b.book_id,
      title: b.title,
      desc: b.intro,
      cover: b.cover_url,
      author: b.author_name,
    });
  });
  return {
    list,
    page: pageNo,
    totalPage: Math.ceil(json.paging.count / 30),
  };
}
```
