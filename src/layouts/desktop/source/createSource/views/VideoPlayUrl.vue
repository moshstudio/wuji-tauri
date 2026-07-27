<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import type { RetryAction } from '@/views/video/composables/useRetryStrategy';
import {
  CmsVideoExtension,
  VideoExtension,
} from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { computed, nextTick, onDeactivated, ref, shallowRef, watchEffect } from 'vue';
import Player, { Events } from 'xgplayer';
import CMS_VIDEO_TEMPLATE from '@/components/codeEditor/templates/cmsVideoTemplate.txt?raw';
import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import VideoJsPlugin from '@/components/media/plugins/videoJs';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import { shouldFastPathWebviewFallback } from '@/utils/videoMediaType';
import {
  resolvePlayableVideoUrl,
  resolveUrlViaWebview,
} from '@/utils/videoPlayResolver';
import { RetryStrategy } from '@/views/video/composables/useRetryStrategy';
import CreateSourcePreviewShell from '../CreateSourcePreviewShell.vue';
import { CreateSourceRunStatus } from '../useCreateSourceListRunner';
import 'xgplayer/dist/index.min.css';

const props = defineProps<{
  content: FormItem<VideoItem>;
  updateResult: (
    type: 'video',
    page: 'playUrl',
    result: VideoUrlMap | undefined,
    padded: boolean,
  ) => void;
  close: () => void;
  log: (...args: any[]) => void;
}>();

const runStatus = ref<CreateSourceRunStatus>(
  CreateSourceRunStatus.not_running,
);
const showPlaylist = ref(true);
const errorMessage = ref('运行失败');
const result = ref<VideoUrlMap>();
const selectedResource = ref<VideoResource>();
const selectedEpisode = ref<VideoEpisode>();
const sourceItem = computed(() => findPage('detail')?.result);
const videoElement = ref<HTMLElement>();
const videoPlayer = ref<Player>();
const videoSrc = ref<VideoUrlMap>();
const playUrlFetching = ref(false);
const retryStrategy = shallowRef(new RetryStrategy());
let resolveAbort: AbortController | null = null;

function shouldAllowWebviewFallback(raw: VideoUrlMap): boolean {
  return !!(
    raw.url
    && !raw.isLive
    && shouldFastPathWebviewFallback(raw.url)
    && !retryStrategy.value.hasWebviewTried(raw.url)
  );
}

async function applyResolvedPlayUrl(
  raw: VideoUrlMap,
  options: { allowWebviewFallback?: boolean; signal?: AbortSignal } = {},
): Promise<VideoUrlMap> {
  const { resolved, webviewUsed } = await resolvePlayableVideoUrl(raw, {
    signal: options.signal,
    allowWebviewFallback: options.allowWebviewFallback ?? shouldAllowWebviewFallback(raw),
  });
  if (options.signal?.aborted) {
    return resolved;
  }
  if (webviewUsed && raw.url) {
    retryStrategy.value.markWebviewTried(raw.url);
  }
  retryStrategy.value.markResolvedType(resolved.url, resolved.type);
  return resolved;
}

async function retryPlayback(action: RetryAction) {
  resolveAbort?.abort();
  const abort = new AbortController();
  resolveAbort = abort;
  const signal = abort.signal;

  switch (action.type) {
    case 'switch-media-type': {
      const current = videoSrc.value;
      if (!current)
        return;
      const newSrc: VideoUrlMap = { ...current, type: action.nextType };
      console.warn(
        `[CreateSource] type ${current.type ?? '(none)'} failed, retry ${action.nextType}`,
      );
      const resolved = await applyResolvedPlayUrl(newSrc, { signal });
      if (signal.aborted)
        return;
      videoSrc.value = resolved;
      result.value = resolved;
      break;
    }
    case 'webview-fallback': {
      try {
        const playableUrl = await resolveUrlViaWebview(action.originalUrl, signal);
        if (signal.aborted)
          return;
        retryStrategy.value.markWebviewTried(action.originalUrl);
        if (!playableUrl) {
          return;
        }
        const nextSrc: VideoUrlMap = {
          ...(videoSrc.value || {}),
          url: playableUrl,
        };
        const resolved = await applyResolvedPlayUrl(nextSrc, {
          signal,
          allowWebviewFallback: false,
        });
        if (signal.aborted)
          return;
        videoSrc.value = resolved;
        result.value = resolved;
      }
      catch {
        /* ignore */
      }
      break;
    }
    case 'refetch-url': {
      await load(true);
      break;
    }
  }
}

async function initLoad() {
  resolveAbort?.abort();
  resolveAbort = null;
  retryStrategy.value.reset();
  result.value = undefined;
  selectedResource.value = undefined;
  selectedEpisode.value = undefined;
  videoSrc.value = undefined;
  return await load();
}

async function load(silent = false) {
  if (!findPage('constructor')?.code) {
    showDialog({
      message: '《初始化》code未定义!',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('list')?.passed) {
    showDialog({
      message: '请先执行通过《推荐影视》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('searchList')?.passed) {
    showDialog({
      message: '请先执行通过《搜索影视》',
      showCancelButton: false,
    });
    return;
  }
  if (!findPage('detail')?.passed) {
    showDialog({
      message: '请先执行通过《影视详情》',
      showCancelButton: false,
    });
    return;
  }
  if (
    !findPage('list')?.result
    && !findPage('searchList')?.result
    && !findPage('detail')?.result
  ) {
    showDialog({
      message: '请先保证《推荐影视》或《搜索影视》或《影视详情》执行不为空',
      showCancelButton: false,
    });
    return;
  }
  const template
    = props.content.mode === 'cms' ? CMS_VIDEO_TEMPLATE : VIDEO_TEMPLATE;
  const code = template
    .replace('// @METHOD_CONSTRUCTOR', findPage('constructor')!.code)
    .replace('// @METHOD_LIST', findPage('list')!.code)
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
    .replace('// @METHOD_DETAIL', findPage('detail')!.code)
    .replace('// @METHOD_PLAY_URL', findPage('playUrl')!.code);
  if (silent) {
    playUrlFetching.value = true;
  }
  else {
    runStatus.value = CreateSourceRunStatus.running;
  }
  try {
    const func = new Function('VideoExtension', 'CmsVideoExtension', code);
    const ExtensionClass = func(VideoExtension, CmsVideoExtension);
    const cls = new ExtensionClass() as VideoExtension;
    if (cls.baseUrl === undefined) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;

    if (!selectedResource.value) {
      selectedResource.value = sourceItem.value?.resources?.find(
        x => !!x.episodes?.length,
      );
    }
    if (!selectedEpisode.value) {
      selectedEpisode.value = selectedResource.value?.episodes?.[0];
    }

    if (
      !sourceItem.value
      || !selectedResource.value
      || !selectedEpisode.value
    ) {
      throw new Error('请先保证《影视详情》执行不为空');
    }
    resolveAbort?.abort();
    const abort = new AbortController();
    resolveAbort = abort;

    const res = await cls?.execGetPlayUrl(
      sourceItem.value,
      selectedResource.value,
      selectedEpisode.value,
    );
    if (!res?.url) {
      throw new Error('获取播放地址失败! 返回结果为空');
    }
    retryStrategy.value.resetForNewUrl(res.url);
    const resolved = await applyResolvedPlayUrl(res, { signal: abort.signal });
    if (abort.signal.aborted) {
      return;
    }
    result.value = resolved;
    videoSrc.value = resolved;
    props.updateResult('video', 'playUrl', result.value, true);
    runStatus.value = CreateSourceRunStatus.success;
  }
  catch (error) {
    errorMessage.value = String(error);
    runStatus.value = CreateSourceRunStatus.error;
    props.updateResult('video', 'playUrl', result.value, false);
  }
  finally {
    playUrlFetching.value = false;
  }
}

function onPreviewResource(resource: VideoResource) {
  selectedResource.value = resource;
}

function findPage(name: string) {
  return props.content.pages.find(page => page.type === name);
}

watchEffect(async (onCleanup) => {
  const video = videoSrc.value;
  const el = videoElement.value;
  if (!video?.url || !el) {
    videoPlayer.value?.destroy();
    videoPlayer.value = undefined;
    return;
  }
  await nextTick();
  if (!videoElement.value) {
    return;
  }
  videoPlayer.value?.destroy();
  const player = new Player({
    el: videoElement.value,
    url: video.url,
    videoType: video.type,
    autoplay: true,
    loop: false,
    playsinline: true,
    cssFullscreen: false,
    volume: 1,
    isLive: video.isLive || false,
    height: '100%',
    width: '100%',
    keyShortcuts: false,
    plugins: [VideoJsPlugin],
    ignores: ['fullscreen', 'keyboard'],
    videoAttributes: {
      crossOrigin: 'anonymous',
    },
  });
  videoPlayer.value = player;
  player.on(Events.ERROR, (error) => {
    console.warn(`播放失败: ${JSON.stringify(error)}`);
    const action = retryStrategy.value.decideOnError(videoSrc.value);
    if (action) {
      void retryPlayback(action);
    }
  });
  player.getPlugin('error').useHooks('errorRetry', () => {
    void retryPlayback({ type: 'refetch-url' });
    return false;
  });
  player.getPlugin('error').useHooks('showError', () => {
    player.controls?.show();
  });
  onCleanup(() => {
    player.destroy();
  });
});

onDeactivated(() => {
  resolveAbort?.abort();
  resolveAbort = null;
  if (videoPlayer.value) {
    videoPlayer.value.pause();
    videoPlayer.value.reset();
  }
});

function loadEpisode(
  resource: VideoResource,
  episode: VideoEpisode,
) {
  selectedResource.value = resource;
  selectedEpisode.value = episode;
  load(true);
}

defineExpose({
  initLoad,
});
</script>

<template>
  <CreateSourcePreviewShell
    :run-status="runStatus"
    :error-message="errorMessage"
  >
    <AppVideoDetail
      v-if="sourceItem"
      v-model:show-playlist="showPlaylist"
      preview
      :video-item="sourceItem"
      :playing-resource="selectedResource"
      :playing-episode="selectedEpisode"
      :on-preview-episode="loadEpisode"
      :on-preview-resource="onPreviewResource"
    >
      <div class="relative shrink-0">
        <div ref="videoElement" class="!relative !h-[200px] !w-full" />
        <div
          v-if="playUrlFetching"
          class="absolute inset-0 z-10 flex items-center justify-center bg-black/40"
        >
          <van-loading color="#fff" />
        </div>
      </div>
    </AppVideoDetail>
  </CreateSourcePreviewShell>
</template>

<style scoped lang="less"></style>
