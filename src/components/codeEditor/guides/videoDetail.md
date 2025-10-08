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
  const document = await this.fetchDom(item.url);
  item.intro = document.querySelector('.detail-desc p')?.textContent.trim();
  const rows = Array.from(document.querySelectorAll('.detail-info-row').values());
  item.director = rows[0].querySelector('.detail-info-row-main')?.textContent;
  item.cast = rows[1].querySelector('.detail-info-row-main')?.textContent;

  const tagElements = Array.from(document.querySelectorAll('.detail-tags a').values());
  item.releaseDate = tagElements[0]?.textContent;
  item.country = tagElements[1]?.textContent;
  if (tagElements.length > 2) {
    item.tags = tagElements
      .slice(2)
      .map((a) => a.textContent)
      .join('');
  }
  const resources = [];
  const sourceNames = Array.from(
    document.querySelectorAll('.episode-box .swiper-slide .source-item span').values(),
  ).map((a) => a.textContent);
  const episodeElements = Array.from(
    document.querySelectorAll('.episode-box-main .episode-list').values(),
  );
  sourceNames.forEach((sourceName, index) => {
    const episodeElement = episodeElements[index];
    if (!episodeElement) return;
    if (sourceName.includes('超清') || sourceName.includes('4K')) return;
    const episodes = [];
    episodeElement.querySelectorAll('a[href]').forEach((a) => {
      const url = this.urlJoin(this.baseUrl, a.getAttribute('href'));
      episodes.push({
        id: url,
        title: a.textContent,
        url: url,
      });
    });
    resources.push({
      id: sourceName,
      title: sourceName,
      episodes: episodes,
    });
  });
  item.resources = resources;
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
