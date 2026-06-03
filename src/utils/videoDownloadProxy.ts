import type { VideoUrlMap } from '@wuji-tauri/source-extension';
import type { PlaybackProxyAlignOptions } from '@/utils/videoPlaybackProxy';
import { invoke } from '@tauri-apps/api/core';
import {
  buildPlaybackAlignedProxyHeaders,
  isHlsVideoSource,
  isLocalPlayerProxyUrl,
  needsPlaybackAlignedProxy,
} from '@/utils/videoPlaybackProxy';

export type { PlaybackProxyAlignOptions };

/**
 * 将解析后的播放地址转换为下载可用地址（与播放侧代理策略对齐）。
 */
export async function alignVideoUrlForDownload(
  urlMap: VideoUrlMap,
  opts?: PlaybackProxyAlignOptions,
): Promise<VideoUrlMap> {
  if (!urlMap.url) {
    return urlMap;
  }

  if (isLocalPlayerProxyUrl(urlMap.url)) {
    return { ...urlMap, headers: {} };
  }

  if (!needsPlaybackAlignedProxy(urlMap, opts)) {
    return urlMap;
  }

  const headers = buildPlaybackAlignedProxyHeaders(urlMap, opts?.pageUrl);
  const proxyUrl = isHlsVideoSource(urlMap)
    ? await invoke<string>('plugin:proxy-plugin|get_m3u8_url', {
        originalUrl: urlMap.url,
        headers,
      })
    : await invoke<string>('plugin:proxy-plugin|get_proxy_url', {
        originalUrl: urlMap.url,
        headers,
      });

  if (!proxyUrl) {
    return urlMap;
  }

  return {
    ...urlMap,
    url: proxyUrl,
    headers: {},
  };
}
