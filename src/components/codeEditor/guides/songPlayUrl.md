## 函数定义

```typescript
/**
 * 歌曲URL映射接口 - 定义不同音质和资源的URL
 */
export interface SongUrlMap {
  '128k'?: string; // 128kbps音质URL
  '128'?: string;  // 128kbps音质URL(简写)
  '320k'?: string; // 320kbps音质URL
  '320'?: string;  // 320kbps音质URL(简写)
  flac?: string;   // FLAC无损音质URL
  pic?: string;    // 歌曲封面图片URL
  bgPic?: string;  // 背景图片URL
  lyric?: string;  // 歌词文本
  lyricUrl?: string; // 歌词文件URL
  headers?: Record<string, string>; // 请求头信息
}

/**
 * 获取歌曲URL的抽象方法
 * @param item 歌曲信息对象
 * @param size 音质大小(可选)
 * @returns 返回SongUrlMap对象、字符串URL或null的Promise
 *
 * 说明：
 * - 当返回SongUrlMap时，包含多种音质的URL
 * - 当返回string时，通常是直接返回单个音质的URL
 * - 返回null表示获取失败
 */
abstract getSongUrl(
  item: SongInfo,
  size?: SongSize,  // SongSize应为定义好的音质枚举类型，如'128k'|'320k'|'flac'等
): Promise<SongUrlMap | string | null>;
```

## 从DOM获取元素

```javascript
async function getSongUrl(item, size) {
  const document = await this.fetchDom(item.url);
  const element = document.querySelector('div.song-list-box a[href]');
  return element ? element.href : null;
}
```

## 从api获取元素

```javascript
async function getSongUrl(item, size) {
  const cid = item.cid;
  if (!cid) {
    return null;
  }

  for (const quality of ['PQ', 'HQ', 'SQ']) {
    const url =
      `https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2` +
      `?netType=01&resourceType=E&songId=${item.id}&toneFlag=${quality}`;
    const response = await this.fetch(url, {
      headers: {
        channel: '0146951',
        uuid: '1234',
      },
    });
    if (!response || response.info?.includes('歌曲下线')) {
      return null;
    }
    if (response.data?.url) {
      return {
        '128k': response.data.url,
        lyric: item.lyric || (await this.getLyric(item)),
      };
    }
  }
  return null;
}
```
