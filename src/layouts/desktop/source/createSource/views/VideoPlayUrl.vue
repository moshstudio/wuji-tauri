<script setup lang="ts">
import type { VideoPlayerState } from '@videojs-player/vue';
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { VideoJsPlayer } from 'video.js';
import { VideoExtension } from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { computed, ref, watch } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import MVideoPlayer from '@/components/media/MVideoPlayer.vue';
import { FormItem } from '@/store/sourceCreateStore';

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

enum RunStatus {
  not_running = 'not_running',
  running = 'running',
  success = 'success',
  error = 'error',
}

const runStatus = ref<RunStatus>(RunStatus.not_running);
const errorMessage = ref('运行失败');
const result = ref<VideoUrlMap>();
const selectedResource = ref<VideoResource>();
const selectedEpisode = ref<VideoEpisode>();

async function initLoad() {
  result.value = undefined;
  return await load();
}

async function load() {
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
    !findPage('list')?.result &&
    !findPage('searchList')?.result &&
    !findPage('detail')?.result
  ) {
    showDialog({
      message: '请先保证《推荐影视》或《搜索影视》或《影视详情》执行不为空',
      showCancelButton: false,
    });
    return;
  }
  const code = BOOK_TEMPLATE.replace(
    'constructor() {}',
    findPage('constructor')!.code,
  )
    .replace(
      'async getRecommendVideos(pageNo, type) {}',
      findPage('list')!.code,
    )
    .replace('async search(keyword, pageNo) {}', findPage('searchList')!.code)
    .replace('async getVideoDetail(item, pageNo) {}', findPage('detail')!.code)
    .replace(
      'async getPlayUrl(item, resource, episode) {}',
      findPage('playUrl')!.code,
    );
  runStatus.value = RunStatus.running;
  try {
    const func = new Function('VideoExtension', code);
    const extensionclass = func(VideoExtension);
    const cls = new extensionclass() as VideoExtension;
    if (!cls.baseUrl) {
      throw new Error('初始化中的baseUrl未定义!');
    }
    cls.log = props.log;

    if (!selectedResource.value) {
      selectedResource.value = sourceItem.value?.resources?.find(
        (x) => !!x.episodes?.length,
      );
    }
    if (!selectedEpisode.value) {
      selectedEpisode.value = selectedResource.value?.episodes?.[0];
    }

    if (
      !sourceItem.value ||
      !selectedResource.value ||
      !selectedEpisode.value
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
    result.value = res;
    videoSrc.value = res;
    props.updateResult('video', 'playUrl', result.value, true);
    runStatus.value = RunStatus.success;
  } catch (error) {
    errorMessage.value = String(error);
    runStatus.value = RunStatus.error;
    props.updateResult('video', 'playUrl', result.value, false);
  }
}

function findPage(name: string) {
  return props.content.pages.find((page) => page.type === name);
}
const sourceItem = computed(() => findPage('detail')?.result);
const videoPlayer = ref<VideoJsPlayer>();
const playerState = ref<VideoPlayerState>();
const videoSrc = ref<VideoUrlMap>();
const videoSources = ref<import('video.js').default.Tech.SourceObject[]>([]);
watch(
  videoSrc,
  (_) => {
    if (videoSrc.value) {
      function getStreamType(): string {
        if (videoSrc.value?.type) {
          switch (videoSrc.value?.type) {
            case 'm3u8':
              return 'application/x-mpegURL';
            case 'mp4':
              return 'video/mp4';
            case 'hls':
              return 'application/x-mpegURL';
            case 'dash':
              return 'application/dash+xml';
            case 'rtmp':
              return 'rtmp/flv';
          }
        }
        const url = videoSrc.value?.url || '';
        if (typeof url === 'string') {
          if (url.includes('.m3u8')) {
            return 'application/x-mpegURL'; // HLS
          } else if (url.includes('.mpd')) {
            return 'application/dash+xml'; // DASH
          } else if (url.includes('rtmp://')) {
            return 'rtmp/flv'; // RTMP
          } else if (videoSrc.value?.isLive) {
            return 'application/x-mpegURL'; // HLS
          } else if (url.includes('mp4')) {
            return 'video/mp4';
          }
        }

        return 'application/x-mpegURL'; // 默认
      }
      videoSources.value = [
        {
          src: videoSrc.value.url,
          type: getStreamType(), // 根据你的直播流类型设置
        },
      ];
    } else {
      videoSources.value = [];
    }
  },
  { immediate: true },
);

function loadEpisode(episode: VideoEpisode) {
  selectedEpisode.value = episode;
  load();
}

defineExpose({
  initLoad,
});
</script>

<template>
  <div>
    <div v-if="runStatus === RunStatus.not_running">未运行</div>
    <div
      v-else-if="runStatus === RunStatus.running"
      class="flex items-center justify-center"
    >
      <van-loading />
    </div>
    <div v-else-if="runStatus === RunStatus.error" class="text-red-500">
      {{ errorMessage }}
    </div>
    <div v-else>
      <div class="flex grow select-none flex-col overflow-y-auto">
        <MVideoPlayer
          v-model:player="videoPlayer"
          v-model:state="playerState"
          :video-src="videoSrc"
          :video-sources="videoSources"
          :resource="selectedResource"
          :episode="selectedEpisode"
          :on-can-play="(args) => {}"
          :on-play-finished="(args) => {}"
          class="h-[200px] w-full"
          @click="
            () => {
              videoPlayer?.paused ? videoPlayer?.play() : videoPlayer?.pause();
            }
          "
        />
        <div
          class="flex w-full flex-shrink-0 items-center justify-start gap-2 overflow-hidden"
        >
          <h2 class="font-bold">
            {{ sourceItem?.title }}
          </h2>
        </div>
        <div
          class="flex flex-shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-2"
        >
          <van-button
            v-for="resource in sourceItem?.resources"
            :key="`resource${resource.id}`"
            class="flex-shrink-0"
            size="small"
            :type="resource.id === selectedResource?.id ? 'primary' : 'default'"
            :class="
              resource.id === selectedResource?.id
                ? 'video-playing-resource'
                : ''
            "
            @click="
              (e) => {
                selectedResource = resource;
                e.target.scrollIntoView({
                  behavior: 'smooth', // 可选：平滑滚动
                  block: 'nearest', // 垂直方向不强制滚动
                  inline: 'center', // 水平方向居中
                });
              }
            "
          >
            {{ resource.title }}
          </van-button>
        </div>

        <ResponsiveGrid2
          min-width="40"
          class="episode-show-list flex w-full flex-col overflow-y-auto overflow-x-hidden"
        >
          <van-button
            v-for="episode in selectedResource?.episodes"
            :key="`episode${episode.id}`"
            class="flex-shrink-0"
            size="small"
            :type="selectedEpisode?.id !== episode.id ? 'default' : 'success'"
            @click="
              () => {
                loadEpisode(episode);
              }
            "
          >
            {{ episode.title }}
          </van-button>
        </ResponsiveGrid2>
        <div v-if="!result" class="flex w-full items-center justify-center">
          <van-loading />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
