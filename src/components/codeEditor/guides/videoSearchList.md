## 函数定义

```typescript
export interface VideoEpisode {
    id: string;
    title: string;
    url?: string;
    extra?: any;
    lastWatchPosition?: number;
}
export interface VideoResource {
    id: string;
    title: string;
    url?: string;
    episodes?: VideoEpisode[];
    extra?: any;
}
export interface VideoItem {
    id: string;
    title: string;
    intro?: string;
    cover?: string;
    coverHeaders?: Record<string, string> | null;
    releaseDate?: string;
    country?: string;
    duration?: string;
    director?: string;
    cast?: string;
    tags?: string[] | string;
    status?: string;
    latestUpdate?: string;
    url?: string;
    resources?: VideoResource[];
    lastWatchResourceId?: string;
    lastWatchEpisodeId?: string;
    extra?: Record<string, any>;
    sourceId: string;
}
export interface VideoList {
    id?: string;
    list?: VideoItem[];
    page: number;
    pageSize?: number | null;
    totalPage?: number | null;
    type?: string;
}
export type VideosList = VideoList | VideoList[];

// 抽象方法：获取搜索影视
// 参数：
//   keyword - 关键词
//   pageNo - 页码（可选）
// 返回值：
//   VideoList 影视列表 (搜索无需返回VideoList[])
abstract search(keyword: string, pageNo?: number): Promise<VideosList | null>;
```

## 从DOM获取元素

```javascript
async function search(keyword, pageNo) {
  pageNo ||= 1;
  let document;
  if (pageNo === 1 || !this.searchIds[keyword]) {
    const url = `${this.baseUrl}/e/search/1index.php`;
    const body = `show=title&tempid=1&tbname=article&mid=1&dopost=search&submit=&keyboard=${keyword}`;
    const response = await this.fetch(url, {
      method: 'POST',
      body,
      headers: this.headers,
    });
    const text = await response.text();
    const searchId = URL.parse(response.url).searchParams.get('searchid');
    if (!searchId) return null;
    this.searchIds[keyword] = searchId;
    document = new DOMParser().parseFromString(text, 'text/html');
  } else {
    const url = `${this.baseUrl}e/search/result/?page=${pageNo}&searchid=${this.searchIds[keyword]}`;
    document = await this.fetchDom(url);
  }
  const list = await this.queryVideoElements(document, {
    element: '#post_container li',
    cover: 'img',
    title: 'h2 a',
    url: 'h2 a',
    tag: '.info_category a',
    latestUpdate: '.info_date',
  });

  const pageElements = document.querySelectorAll('.pagination a');
  return {
    list,
    page: pageNo,
    totalPage: this.maxPageNoFromElements(pageElements),
  };
}
```

## 从api获取元素

```javascript
async function search(keyword, pageNo) {
  const url = `${this.baseUrl}?name=${keyword}&page=${pageNo}`;
  const response = await this.fetch(url);
  const json = await response.json();
  const list = [];
  json.data.forEach((element) => {
    list.push({
      id: element.book_id,
      title: element.title,
      intro: element.intro,
      cover: element.cover,
      cast: element.author,
      tags: element.type?.map((v) => v.name).join(','),
    });
  });
  return {
    list,
    page: pageNo,
    totalPage: json.total_page,
  };
}
```
