<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { FormItem } from '@/store/sourceCreateStore';
import {
  CmsVideoExtension,
  VideoExtension,
} from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { computed, nextTick, onDeactivated, ref, watchEffect } from 'vue';
import Player, { Events } from 'xgplayer';
import CMS_VIDEO_TEMPLATE from '@/components/codeEditor/templates/cmsVideoTemplate.txt?raw';
import VIDEO_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import VideoJsPlugin from '@/components/media/plugins/videoJs';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import { resolveVideoUrlMap } from '@/utils/videoMediaType';
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

async function initLoad() {
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
    const res = await cls?.execGetPlayUrl(
      sourceItem.value,
      selectedResource.value,
      selectedEpisode.value,
    );
    if (!res) {
      throw new Error('获取详情失败! 返回结果为空');
    }
    if (!res) {
      throw new Error('获取播放地址失败!');
    }
    result.value = await resolveVideoUrlMap(res);
    videoSrc.value = result.value;
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
  });
  player.getPlugin('error').useHooks('showError', () => {
    player.controls?.show();
  });
  onCleanup(() => {
    player.destroy();
  });
});

onDeactivated(() => {
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
