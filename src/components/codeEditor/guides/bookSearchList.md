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

// 抽象方法：获取搜索书籍
// 参数：
//   keyword - 关键词
//   pageNo - 页码（可选）
// 返回值：
//   BookList 书籍列表 (搜索无需返回BookList[])
abstract search(keyword: string, pageNo?: number): Promise<BooksList | null>;
```

## 从DOM获取元素

```javascript
async function search(keyword, pageNo) {
  const url = `https://www.rrssk.com/keywords-${keyword}-${pageNo}.html`;
  const document = await this.fetchDom(url, {
    headers: {
      'User-Agent': this.ua,
      'upgrade-insecure-requests': '1',
      Referer: 'https://www.rrssk.com/?89',
    },
  });

  const numMatch = document.head.textContent.match(/const num = '(.+)'/);
  const numB64 = numMatch[1];

  const elements = document.querySelectorAll('.list li');
  const list = [];
  elements.forEach((element) => {
    const cover = element.querySelector('img').getAttribute('src');
    const title = element.querySelector('.name a').textContent.trim();
    const author = element.querySelector('.infoM2 dl:nth-of-type(1) a').textContent.trim();
    const intro = element.querySelector('.intro').textContent.trim();
    const a = element.querySelector('.name a');

    const regex = /toUrl\('([^']+)'/;
    const match = a.getAttribute('onClick').match(regex);
    if (match && match[1]) {
      list.push({
        cover,
        title,
        author,
        intro,
        url: this.openUrl(match[1], numB64),
      });
    }
  });
  const pageElements = document.querySelectorAll('.page a[href]');

  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
    sourceId: '',
  };
}
```

## 从api获取元素

```javascript
async function search(keyword, pageNo) {
  pageNo = pageNo || 1;
  const url = this.urlJoin(
    this.baseUrl,
    `novels/api/book/search?keyword=${keyword}&pi=${pageNo}&ps=30`,
  );
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
