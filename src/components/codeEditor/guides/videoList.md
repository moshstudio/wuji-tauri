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

// 抽象方法：获取推荐影视
// 参数：
//   pageNo - 页码（可选）
//   type - 影视类型（当有多个影视列表时需要传入）
// 返回值：
//   Promise包装的VideosList对象或null（获取失败时返回null）
//   当有多个类型的影视列表时，不传type返回type列表(VideoList[])，传type返回此type的影视列表(VideoList)
//   如果无需type分类, 可直接返回影视列表(VideoList)
abstract getRecommendVideos(pageNo?: number, type?: string): Promise<VideosList | null>;
```

## 从DOM获取元素

```javascript
async function getRecommendVideos(pageNo, type) {
  let items = [
    {
      name: '首页',
      tag: '',
    },
    {
      name: '喜剧',
      tag: 'xijupian',
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
  let url = `${this.baseUrl}${item.tag}`;
  if (pageNo > 1) {
    url += `/index_${pageNo}.html`;
  }
  const document = await this.fetchDom(url);
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
    type,
  };
}
```

## 从api获取元素

```javascript
async function getRecommendComics(pageNo, type) {
  if (!this.recommands) {
    const response = await this.fetch(`https://sp-api.contentchina.com/website/v1/index`);
    this.recommands = await response.json();
  }
  if (!type) {
    const items = this.recommands.data.categories_list.map((item, index) => {
      return {
        id: index,
        type: item.title,
      };
    });
    return items;
  }
  const items = this.recommands.data.categories_list
    .find((item) => item.title === type)
    .list.map((item) => {
      return {
        id: `https://v.contentchina.com/play/${item.serial_id}.html`,
        title: item.title,
        cover: item.cover_url,
        coverHeaders: {},
        url: `https://v.contentchina.com/play/${item.serial_id}.html`,
        tags: item.categories,
        intro: item.introduction,
      };
    });

  return {
    list: items,
    page: pageNo,
    totalPage: 1,
    type,
  };
}
```
