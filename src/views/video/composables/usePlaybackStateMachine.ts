import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { Ref } from 'vue';
import type { RetryAction } from './useRetryStrategy';
import _ from 'lodash';
import { showFailToast } from 'vant';
import { ref, shallowRef } from 'vue';
import { usePageDataLoader } from '@/hooks/usePageDataLoader';
import {
  useDisplayStore,
  useStore,
  useSubscribeSourceStore,
  useVideoShelfStore,
} from '@/store';
import {
  shouldFastPathWebviewFallback,
} from '@/utils/videoMediaType';
import {
  resolvePlayableVideoUrl,
  resolveUrlViaWebview,
  resolveVideoEpisodeUrl,
} from '@/utils/videoPlayResolver';
import { ensureSource } from '@/utils/sourceAccess';
import { RetryStrategy } from './useRetryStrategy';

// ─── 状态定义 ───

export type PlaybackStateKind
  = | 'idle'
    | 'loading-data'
    | 'fetching-url'
    | 'resolving'
    | 'playing'
    | 'retrying'
    | 'error';

/** 解析元数据：供投屏/下载对齐代理（WebView 嗅探 Referer 等） */
export interface ResolvedSrcMeta {
  rawUrl: string;
  webviewUsed: boolean;
}

// ─── 组合式函数 ───

export function usePlaybackStateMachine(options: {
  videoId: Ref<string>;
  sourceId: Ref<string>;
}) {
  const store = useStore();
  const subscribeStore = useSubscribeSourceStore();
  const displayStore = useDisplayStore();
  const shelfStore = useVideoShelfStore();

  // --- 核心状态 ---
  const state = ref<PlaybackStateKind>('idle');
  const videoSource = ref<VideoSource>();
  const videoItem = ref<VideoItem>();
  const playingResource = ref<VideoResource>();
  const playingEpisode = ref<VideoEpisode>();
  const resolvedSrc = ref<VideoUrlMap>();
  const resolvedSrcMeta = ref<ResolvedSrcMeta>();
  const shouldReload = ref(false);
  const errorMessage = ref<string>();

  // --- 内部 ---
  const retryStrategy = shallowRef(new RetryStrategy());
  let currentAbort: AbortController | null = null;

  const { run: runLoader } = usePageDataLoader({
    onFailed: () => showFailToast('加载失败，请检查网络或订阅源状态'),
  });

  // ─── 取消/信号管理 ───

  function beginTransition(): AbortSignal {
    currentAbort?.abort();
    currentAbort = new AbortController();
    return currentAbort.signal;
  }

  function abortCurrent() {
    currentAbort?.abort();
    currentAbort = null;
  }

  function isStale(signal: AbortSignal) {
    return signal.aborted;
  }

  // ─── URL 解析管线 ───

  function shouldAllowWebviewFallbackForRaw(raw: VideoUrlMap): boolean {
    return !!(
      raw.url
      && !raw.isLive
      && shouldFastPathWebviewFallback(raw.url)
      && !retryStrategy.value.hasWebviewTried(raw.url)
    );
  }

  function applyResolved(
    resolved: VideoUrlMap,
    signal: AbortSignal,
    meta?: { rawUrl?: string; webviewUsed?: boolean },
  ): boolean {
    if (isStale(signal))
      return false;
    if (meta?.webviewUsed && meta.rawUrl) {
      retryStrategy.value.markWebviewTried(meta.rawUrl);
    }
    retryStrategy.value.markResolvedType(resolved.url, resolved.type);
    resolvedSrc.value = resolved;
    if (meta?.rawUrl) {
      resolvedSrcMeta.value = {
        rawUrl: meta.rawUrl,
        webviewUsed: !!meta.webviewUsed,
      };
    }
    state.value = 'playing';
    return true;
  }

  async function resolveAndApply(
    src: VideoUrlMap,
    signal: AbortSignal,
    metaOverride?: { rawUrl?: string; webviewUsed?: boolean },
  ): Promise<boolean> {
    state.value = 'resolving';
    const { resolved, webviewUsed } = await resolvePlayableVideoUrl(src, {
      signal,
      allowWebviewFallback: shouldAllowWebviewFallbackForRaw(src),
    });
    return applyResolved(resolved, signal, {
      rawUrl: metaOverride?.rawUrl ?? src.url,
      webviewUsed: metaOverride?.webviewUsed ?? webviewUsed,
    });
  }

  // ─── 核心动作：获取播放 URL ───

  async function fetchPlayUrl(signal: AbortSignal): Promise<boolean> {
    if (!playingResource.value || !playingEpisode.value || !videoItem.value) {
      return false;
    }
    state.value = 'fetching-url';

    const t = displayStore.showToast();
    try {
      state.value = 'resolving';
      const { raw, resolved, webviewUsed } = await resolveVideoEpisodeUrl({
        source: videoSource.value!,
        video: videoItem.value,
        resource: playingResource.value,
        episode: playingEpisode.value,
        videoPlay: (s, v, r, e) => store.videoPlay(s, v, r, e),
        signal,
        allowWebviewFallback: shouldAllowWebviewFallbackForRaw,
      });
      displayStore.closeToast(t);

      if (isStale(signal))
        return false;

      retryStrategy.value.resetForNewUrl(raw.url);
      return applyResolved(resolved, signal, {
        rawUrl: raw.url,
        webviewUsed,
      });
    }
    catch (error) {
      console.error('[Playback] resolve episode url error', error);
      displayStore.closeToast(t);
      if (isStale(signal))
        return false;
      state.value = 'error';
      errorMessage.value = '播放地址获取失败';
      showFailToast('播放地址获取失败');
      return false;
    }
  }

  // ─── 公开动作 ───

  /** 加载视频详情数据并开始播放 */
  async function loadVideo() {
    const signal = beginTransition();
    state.value = 'loading-data';
    resolvedSrc.value = undefined;
    resolvedSrcMeta.value = undefined;

    await runLoader(async (loaderSignal) => {
      const combinedAborted = () => signal.aborted || loaderSignal.aborted;

      videoSource.value = undefined;
      videoItem.value = undefined;
      playingResource.value = undefined;
      playingEpisode.value = undefined;
      shouldReload.value = false;
      resolvedSrc.value = undefined;
      resolvedSrcMeta.value = undefined;

      if (!options.videoId.value || !options.sourceId.value) {
        showFailToast('跳转参数错误');
        shouldReload.value = true;
        return true;
      }

      const loaded = await subscribeStore.waitForLoaded();
      if (combinedAborted())
        return true;
      if (!loaded) {
        showFailToast('订阅源加载超时，请稍后重试');
        shouldReload.value = true;
        return true;
      }

      const ensured = await ensureSource(options.sourceId.value, 'video');
      if (!ensured.ok) {
        shouldReload.value = true;
        return true;
      }

      videoSource.value = ensured.source;
      videoItem.value = store.getVideoItem(ensured.source, options.videoId.value!);
      if (!videoItem.value) {
        shouldReload.value = true;
        return false;
      }

      const t = displayStore.showToast();
      const detail
        = (await store.videoDetail(ensured.source, videoItem.value, { silent: true }))
          || undefined;
      displayStore.closeToast(t);
      if (combinedAborted())
        return true;

      if (detail?.id !== videoItem.value?.id) {
        shouldReload.value = true;
        return false;
      }

      Object.assign(videoItem.value, detail);
      if (!videoItem.value) {
        shouldReload.value = true;
        return false;
      }

      const hasContent
        = videoItem.value.resources?.length
          && videoItem.value.resources.some(r => r.episodes?.length);
      shouldReload.value = !hasContent;

      playingResource.value
        ||= _.find(
          videoItem.value.resources,
          resource => resource.id === videoItem.value?.lastWatchResourceId,
        ) || videoItem.value.resources?.[0];
      playingEpisode.value
        ||= _.find(
          playingResource.value?.episodes,
          episode => episode.id === videoItem.value?.lastWatchEpisodeId,
        ) || playingResource.value?.episodes?.[0];

      if (combinedAborted())
        return true;

      if (playingResource.value && playingEpisode.value) {
        shelfStore.updateVideoPlayInfo(videoItem.value, {
          resource: playingResource.value,
          episode: playingEpisode.value,
        });
        await fetchPlayUrl(signal);
      }

      return true;
    });
  }

  /** 切换剧集 / 线路 */
  async function playEpisode(resource: VideoResource, episode: VideoEpisode) {
    const signal = beginTransition();
    retryStrategy.value.resetForNewUrl('');
    resolvedSrc.value = undefined;
    resolvedSrcMeta.value = undefined;

    playingResource.value = resource;
    playingEpisode.value = episode;
    shelfStore.updateVideoPlayInfo(videoItem.value!, { resource, episode });

    await fetchPlayUrl(signal);
  }

  /** 切换整部视频（路由参数变化） */
  async function switchVideo() {
    retryStrategy.value.reset();
    resolvedSrc.value = undefined;
    resolvedSrcMeta.value = undefined;
    state.value = 'idle';
    await loadVideo();
  }

  /** 重试：播放错误后的自动/手动重试 */
  async function retry(action: RetryAction) {
    const signal = beginTransition();
    state.value = 'retrying';

    switch (action.type) {
      case 'switch-media-type': {
        const current = resolvedSrc.value;
        if (!current)
          return;
        const newSrc: VideoUrlMap = { ...current, type: action.nextType };
        console.warn(
          `[Playback] type ${current.type ?? '(none)'} failed, retry ${action.nextType}`,
        );
        await resolveAndApply(newSrc, signal);
        break;
      }
      case 'webview-fallback': {
        try {
          const playableUrl = await resolveUrlViaWebview(action.originalUrl, signal);
          if (isStale(signal))
            return;
          retryStrategy.value.markWebviewTried(action.originalUrl);
          if (!playableUrl) {
            state.value = 'error';
            errorMessage.value = '播放失败';
            return;
          }
          const nextSrc: VideoUrlMap = {
            ...(resolvedSrc.value || {}),
            url: playableUrl,
          };
          await resolveAndApply(nextSrc, signal, {
            rawUrl: action.originalUrl,
            webviewUsed: true,
          });
        }
        catch {
          if (!isStale(signal)) {
            state.value = 'error';
            errorMessage.value = '播放失败';
          }
        }
        break;
      }
      case 'refetch-url': {
        await fetchPlayUrl(signal);
        break;
      }
    }
  }

  /** 投屏失败时重新解析播放地址（含 WebView 回退） */
  async function refetchPlayUrlForCast(): Promise<boolean> {
    if (
      !playingResource.value
      || !playingEpisode.value
      || !videoItem.value
      || !videoSource.value
    ) {
      return false;
    }

    const abort = new AbortController();
    try {
      const { raw, resolved, webviewUsed } = await resolveVideoEpisodeUrl({
        source: videoSource.value,
        video: videoItem.value,
        resource: playingResource.value,
        episode: playingEpisode.value,
        videoPlay: (s, v, r, e) => store.videoPlay(s, v, r, e),
        signal: abort.signal,
        allowWebviewFallback: true,
      });
      if (!raw.url) {
        return false;
      }
      return applyResolved(resolved, abort.signal, {
        rawUrl: raw.url,
        webviewUsed,
      });
    }
    catch (error) {
      console.warn('[Playback] refetch for cast failed', error);
      return false;
    }
  }

  /** 从外部恢复已知的 src（KeepAlive 恢复时用） */
  function restoreSrc(src: VideoUrlMap) {
    resolvedSrc.value = src;
    state.value = 'playing';
  }

  /** 完全重置（离开页面时） */
  function reset() {
    abortCurrent();
    retryStrategy.value.reset();
    state.value = 'idle';
    videoSource.value = undefined;
    videoItem.value = undefined;
    playingResource.value = undefined;
    playingEpisode.value = undefined;
    resolvedSrc.value = undefined;
    resolvedSrcMeta.value = undefined;
    shouldReload.value = false;
    errorMessage.value = undefined;
  }

  return {
    // 状态（只读）
    state,
    videoSource,
    videoItem,
    playingResource,
    playingEpisode,
    resolvedSrc,
    resolvedSrcMeta,
    shouldReload,
    errorMessage,
    retryStrategy,

    // 动作
    loadVideo,
    playEpisode,
    switchVideo,
    retry,
    refetchPlayUrlForCast,
    restoreSrc,
    reset,
    abortCurrent,
  };
}
