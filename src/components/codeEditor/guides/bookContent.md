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


/**
 * 抽象方法 - 获取书籍章节详情
 * @param item 书籍对象（必传）
 * @param chapter 书籍章节对象（必传）
 * @returns 返回章节内容字符串
 */
abstract getContent(item: BookItem, chapter: BookChapter): Promise<string | null>;
```

## 从DOM获取元素

```javascript
async function getContent(item, chapter) {
  let url = chapter.url;
  const document = await this.fetchDom(url);
  let contentElements = document.querySelectorAll('.content p');
  return Array.from(contentElements.values())
    .map((element) => element.textContent)
    .join('\n');
}
```

## 从api获取元素

```javascript
async function getContent(item, chapter) {
  const url = this.urlJoin(this.baseUrl, `novels/api/book/${item.id}/chapters/${chapter.id}`);
  const response = await this.fetch(url);
  const json = await response.json();
  if (json.code != 200) return '无内容';

  return json.data.content;
}
```
