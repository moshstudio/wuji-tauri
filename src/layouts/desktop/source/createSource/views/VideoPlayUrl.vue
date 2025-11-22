<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import Player, { Events } from 'xgplayer';
import 'xgplayer/dist/index.min.css';
import { VideoExtension } from '@wuji-tauri/source-extension';
import { showDialog } from 'vant';
import { computed, nextTick, ref, watch } from 'vue';
import BOOK_TEMPLATE from '@/components/codeEditor/templates/videoTemplate.txt?raw';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { FormItem } from '@/store/sourceCreateStore';
import VideoJsPlugin from '@/components/media/plugins/videoJs';

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
    '// @METHOD_CONSTRUCTOR',
    findPage('constructor')!.code,
  )
    .replace(
      '// @METHOD_LIST',
      findPage('list')!.code,
    )
    .replace('// @METHOD_SEARCH_LIST', findPage('searchList')!.code)
    .replace('// @METHOD_DETAIL', findPage('detail')!.code)
    .replace(
      '// @METHOD_PLAY_URL',
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
const videoElement = ref<HTMLElement>();
const videoPlayer = ref<Player>();
const videoSrc = ref<VideoUrlMap>();
watch(
  videoSrc,
  async (video) => {
    if (videoSrc.value) {
      videoPlayer.value?.destroy();
      await nextTick();
      videoPlayer.value = new Player({
        el: videoElement.value,
        url: video?.url,
        autoplay: true,
        loop: false,
        playsinline: true,
        cssFullscreen: false,
        volume: 1,
        isLive: videoSrc.value?.isLive || false,
        height: '100%',
        width: '100%',
        keyShortcuts: false,
        plugins: [VideoJsPlugin],
        ignores: ['fullscreen', 'keyboard'],
        videoAttributes: {
          crossOrigin: 'anonymous',
        },
      });

      videoPlayer.value.on(Events.ERROR, (error) => {
        console.warn(`播放失败: ${JSON.stringify(error)}`);
      });

      videoPlayer.value.getPlugin('error').useHooks('showError', () => {
        videoPlayer.value?.controls?.show();
      });
    } else {
      videoPlayer.value?.reset();
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
        <div ref="videoElement" class="!relative !h-[200px] !w-full"></div>
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
