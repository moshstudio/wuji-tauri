## 函数定义

```typescript
export interface VideoUrlMap {
    url: string;
    headers?: Record<string, string> | null;
    type?: 'm3u8' | 'mp4' | 'hls' | 'dash' | 'rtmp';
    isLive?: boolean;
    extra?: Record<string, any>;
}
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
 * 抽象方法 - 获取影视播放地址
 * @param item 影视对象（必传）
 * @param resource VideoResource
 * @param episode VideoEpisode
 * @returns VideoUrlMap 返回播放地址
 */
abstract getPlayUrl(item: VideoItem, resource: VideoResource, episode: VideoEpisode): Promise<VideoUrlMap | null>;
```

## 从DOM获取元素

```javascript
async function getPlayUrl(item, resource, episode) {
  const document = await this.fetchDom(episode.url, {
    headers: this.headers,
  });
  const iframe = document.querySelector('.video iframe');
  let domExtractedUrl = '';
  if (iframe) {
    const url = iframe.getAttribute('src');
    const doc = await this.fetchDom(url);
    const scripts = doc.querySelectorAll('script');

    scripts.forEach((script) => {
      if (script.textContent.includes('url:')) {
        const urlMatch = script.textContent.match(/url:\s*'([^']+)'/);
        if (urlMatch) {
          domExtractedUrl = urlMatch[1];
        }
      }
    });
  } else {
    const scripts = document.querySelectorAll('script');
    scripts.forEach((script) => {
      if (script.textContent.includes('source:')) {
        // source: "
        const urlMatch = script.textContent.match(/source: "([^"]+)"/);
        if (urlMatch) {
          domExtractedUrl = urlMatch[1];
        }
      }
    });
  }
  return { url: domExtractedUrl };
}
```

## 从api获取元素

```javascript
async function getPlayUrl(item, resource, episode) {
  const response = await this.fetch(episode.url);
  return {
    url: await this.getProxyUrl(response.url, { referer: response.url }),
  };
}
```
