import type { VideoUrlMap } from '@wuji-tauri/source-extension';

/** 与播放/下载对齐的代理判定上下文（如 WebView 嗅探后的 Referer） */
export interface PlaybackProxyAlignOptions {
  pageUrl?: string;
  webviewUsed?: boolean;
}

export function isLocalPlayerProxyUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (host === '127.0.0.1' || host === 'localhost')
      && /\/(?:proxy|m3u8)\//.test(url);
  }
  catch {
    return false;
  }
}

export function isHlsVideoSource(urlMap: VideoUrlMap): boolean {
  const type = urlMap.type;
  const url = urlMap.url?.toLowerCase() || '';
  return type === 'm3u8' || type === 'hls' || url.includes('.m3u8');
}

export function needsPlaybackAlignedProxy(
  urlMap: VideoUrlMap,
  opts?: PlaybackProxyAlignOptions,
): boolean {
  if (!urlMap.url) {
    return false;
  }
  if (isLocalPlayerProxyUrl(urlMap.url)) {
    return false;
  }
  const headers = urlMap.headers;
  if (headers && Object.keys(headers).length > 0) {
    return true;
  }
  if (opts?.webviewUsed && opts.pageUrl) {
    return true;
  }
  return false;
}

export function buildPlaybackAlignedProxyHeaders(
  urlMap: VideoUrlMap,
  pageUrl?: string,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (urlMap.headers) {
    for (const [k, v] of Object.entries(urlMap.headers)) {
      if (v != null && v !== '') {
        headers[k] = String(v);
      }
    }
  }
  if (!headers.Referer && !headers.referer && pageUrl) {
    headers.Referer = pageUrl;
  }
  return headers;
}

export function unwrapLocalPlayerProxyUrl(url: string): {
  url: string;
  headers: Record<string, string>;
  wasM3u8: boolean;
} | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/(proxy|m3u8)\/([^/]+)\/(.+)$/);
    if (!match) {
      return null;
    }
    const kind = match[1];
    const headersRaw = decodeURIComponent(match[2]);
    const originalUrl = decodeURIComponent(match[3]);

    const headers: Record<string, string> = {};
    if (headersRaw && headersRaw !== '_') {
      for (const pair of headersRaw.split(',')) {
        const colon = pair.indexOf(':');
        if (colon > 0) {
          headers[pair.slice(0, colon).trim()] = pair.slice(colon + 1).trim();
        }
      }
    }

    return {
      url: originalUrl,
      headers,
      wasM3u8: kind === 'm3u8',
    };
  }
  catch {
    return null;
  }
}
