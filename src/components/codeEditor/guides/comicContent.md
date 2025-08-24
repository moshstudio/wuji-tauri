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

/**
 * 抽象方法 - 获取漫画章节详情
 * @param item 漫画对象（必传）
 * @param chapter 漫画章节对象（必传）
 * @returns 返回章节内容(不再支持分页，一次返回所有内容)
 */
abstract getContent(item: BookItem, chapter: BookChapter): Promise<ComicContent | null>;
```

## 从DOM获取元素

```javascript
async function getContent(item, chapter) {
  function test(p, a, c, k, e, d) {
    e = function (c) {
      return (
        (c < a ? '' : e(parseInt(c / a))) +
        ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
      );
    };
    if (true) {
      while (c--) {
        d[e(c)] = k[c] || e(c);
      }
      k = [
        function (e) {
          return d[e];
        },
      ];
      e = function () {
        return '\\w+';
      };
      c = 1;
    }
    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
      }
    }
    return p;
  }

  const response = await this.fetch(chapter.url);
  const text = await response.text();
  const regx = /return p}\((.*)\)/;
  const params = regx.exec(text)[1].split(',');
  const ret = test(
    params[0],
    Number(params[1]),
    Number(params[2]),
    params[3].split('|'),
    Number(params[4]),
    {},
  );
  const imageS = /img_s=(\d+);/.exec(ret)[1];
  const regx2 = /msg=\\\'([^;]*)\\\';/;
  const images = regx2.exec(ret)[1].split('|');
  return {
    photos: images.map((item) => `https://picsh.77dm.top/h${imageS}/${item.replace("'", '')}`),
    page: 1,
    totalPage: 1,
  };
}
```

## 从api获取元素

```javascript
async function getContent(item, chapter) {
  const url = `${this.baseUrl}api/v1/comic1/chapter/detail`;
  const params = new URLSearchParams({
    channel: 'pc',
    app_name: 'dmzj',
    version: '1.0.0',
    timestamp: `${Date.now()}`,
    uid: '',
    comic_id: `${item.id}`,
    chapter_id: `${chapter.id}`,
  });
  const response = await this.fetch(url + '?' + params.toString());
  const json = await response.json();

  return {
    photos: json.data.chapterInfo.page_url_hd || json.data.chapterInfo.page_url || [],
    page: 1,
    totalPage: 1,
  };
}
```
