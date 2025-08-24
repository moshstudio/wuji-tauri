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

/**
 * 抽象方法 - 获取影视详情
 * @param item 影视对象（必传）
 * @returns 返回原影视对象
 */
abstract getVideoDetail(item: VideoItem): Promise<VideoItem | null>;
```

## 从DOM获取元素

```javascript
async function getVideoDetail(item) {
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
async function getVideoDetail(item) {
  const url = `${this.baseUrl}?book_id=${item.id}`;
  const response = await this.fetch(url);
  const json = await response.json();
  const resources = [
    {
      id: item.id,
      title: '播放列表',
      episodes: [],
    },
  ];
  json.data.forEach((e) => {
    resources[0].episodes.push({
      id: e.video_id,
      title: e.title,
      url: e.url_mp4,
    });
  });

  item.resources = resources;
  return item;
}
```
