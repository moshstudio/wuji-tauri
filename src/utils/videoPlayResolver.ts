import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import {
  resolveVideoUrlMap,
  shouldFastPathWebviewFallback,
} from '@/utils/videoMediaType';
import { extractPlayableUrlFromWebviewResult } from '@/utils/videoWebviewFallback';
import { fetchWebview } from '@/utils/webview';

export interface ResolvePlayableVideoUrlOptions {
  signal?: AbortSignal;
  webviewTimeout?: number;
  allowWebviewFallback?: boolean;
}

export interface ResolvePlayableVideoUrlResult {
  /** 订阅源返回的原始播放地址 */
  raw: VideoUrlMap;
  resolved: VideoUrlMap;
  webviewUsed: boolean;
}

export type AllowWebviewFallbackOption
  = | boolean
    | ((raw: VideoUrlMap) => boolean);

export async function resolveUrlViaWebview(
  originalUrl: string,
  signal?: AbortSignal,
  timeout = 15000,
): Promise<string | null> {
  const ret = await fetchWebview(originalUrl, {
    timeout,
    waitForResources: 'video',
    useSavedCookie: true,
  });
  if (signal?.aborted || !ret) {
    return null;
  }
  const playableUrl = extractPlayableUrlFromWebviewResult(ret);
  if (!playableUrl || playableUrl === originalUrl) {
    return null;
  }
  return playableUrl;
}

export async function resolveVideoEpisodeUrl(params: {
  source: VideoSource;
  video: VideoItem;
  resource: VideoResource;
  episode: VideoEpisode;
  videoPlay: (
    source: VideoSource,
    video: VideoItem,
    resource: VideoResource,
    episode: VideoEpisode,
  ) => Promise<VideoUrlMap | null>;
  allowWebviewFallback?: AllowWebviewFallbackOption;
  signal?: AbortSignal;
  webviewTimeout?: number;
}): Promise<ResolvePlayableVideoUrlResult> {
  const {
    source,
    video,
    resource,
    episode,
    videoPlay,
    allowWebviewFallback = true,
    signal,
    webviewTimeout,
  } = params;

  const rawUrlMap = await videoPlay(source, video, resource, episode);
  if (!rawUrlMap?.url) {
    throw new Error('解析地址失败');
  }

  const allowFallback = typeof allowWebviewFallback === 'function'
    ? allowWebviewFallback(rawUrlMap)
    : allowWebviewFallback;

  const { resolved, webviewUsed } = await resolvePlayableVideoUrl(rawUrlMap, {
    signal,
    webviewTimeout,
    allowWebviewFallback: allowFallback,
  });

  return { raw: rawUrlMap, resolved, webviewUsed };
}

export async function resolvePlayableVideoUrl(
  src: VideoUrlMap,
  options: ResolvePlayableVideoUrlOptions = {},
): Promise<ResolvePlayableVideoUrlResult> {
  const {
    signal,
    webviewTimeout = 15000,
    allowWebviewFallback = true,
  } = options;
  let srcToResolve = src;
  let webviewUsed = false;

  if (
    allowWebviewFallback
    && src.url
    && !src.isLive
    && shouldFastPathWebviewFallback(src.url)
  ) {
    try {
      const fromWebview = await resolveUrlViaWebview(src.url, signal, webviewTimeout);
      if (!signal?.aborted && fromWebview) {
        srcToResolve = { ...src, url: fromWebview };
        webviewUsed = true;
      }
    }
    catch {
      // WebView 嗅探失败时保持原始 URL，继续走类型探测
    }
  }

  if (signal?.aborted) {
    return { raw: src, resolved: srcToResolve, webviewUsed };
  }

  const resolved = await resolveVideoUrlMap(srcToResolve, { signal });
  return { raw: src, resolved, webviewUsed };
}
