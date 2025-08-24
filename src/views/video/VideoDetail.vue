<script setup lang="ts">
import _ from 'lodash';
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import type videojs from 'video.js';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import {
  useDisplayStore,
  useStore,
  useBackStore,
  useVideoShelfStore,
} from '@/store';
import { retryOnFalse } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showFailToast, showToast } from 'vant';
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import AppVideoDetail from '@/layouts/app/video/VideoDetail.vue';
import DesktopVideoDetail from '@/layouts/desktop/video/VideoDetail.vue';
import { storeToRefs } from 'pinia';
import * as commands from 'tauri-plugin-commands-api';

type VideoJsPlayer = ReturnType<typeof videojs>;

const { videoId, sourceId } = defineProps<{
  videoId: string;
  sourceId: string;
}>();

const route = useRoute();
const store = useStore();
const backStore = useBackStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const { videoShelf } = storeToRefs(shelfStore);

const videoPlayer = ref<VideoJsPlayer>();

const videoSource = ref<VideoSource>();
const videoItem = ref<VideoItem>();

const playingResource = ref<VideoResource>();
const playingEpisode = ref<VideoEpisode>();
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

const inShelf = computed(() => {
  for (const shelf of videoShelf.value) {
    if (shelf.videos.some((video) => video.video.id === videoId)) {
      return true;
    }
  }
  return false;
});
const showAddShelfSheet = ref(false);
const addShelfActions = computed(() => {
  return videoShelf.value.map((shelf) => ({
    name: shelf.name,
    subname: `共 ${shelf.videos.length || 0} 个视频`,
    callback: () => {
      if (videoItem.value) {
        shelfStore.addToViseoSelf(videoItem.value, shelf.id);
      }
      showAddShelfSheet.value = false;
    },
  }));
});

const loadData = retryOnFalse({
  onFailed: backStore.back,
})(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
    videoSource.value = undefined;
    videoItem.value = undefined;
    videoSrc.value = undefined;
    playingResource.value = undefined;
    playingEpisode.value = undefined;

    if (!videoId || !sourceId) {
      return false;
    }
    const source = store.getVideoSource(sourceId);
    if (!source) {
      showToast('源不存在或未启用');
      return false;
    }
    videoSource.value = source;
    const item = store.getVideoItem(source, videoId!);
    if (!item) {
      return false;
    }
    videoItem.value = item;
    const t = displayStore.showToast();
    const detail = (await store.videoDetail(source!, item)) || undefined;
    displayStore.closeToast(t);
    if (detail?.id != videoItem.value?.id) {
      return false;
    }
    videoItem.value = detail;
    if (!videoItem.value || signal.aborted) {
      return false;
    }

    playingResource.value ||=
      _.find(
        videoItem.value.resources,
        (resource) => resource.id == videoItem.value?.lastWatchResourceId,
      ) || videoItem.value.resources?.[0];
    playingEpisode.value ||=
      _.find(
        playingResource.value?.episodes,
        (episode) => episode.id == videoItem.value?.lastWatchEpisodeId,
      ) || playingResource.value?.episodes?.[0];
    if (signal.aborted) return false;
    if (playingResource.value && playingEpisode.value) {
      await getPlayUrl();
    }
    return true;
  }),
);

function playOrPause() {
  videoPlayer.value?.paused()
    ? videoPlayer.value.play()
    : videoPlayer.value?.pause();
}

async function play(resource: VideoResource, episode: VideoEpisode) {
  videoSrc.value = undefined;
  videoPlayer.value?.reset();
  playingResource.value = resource;
  playingEpisode.value = episode;
  shelfStore.updateVideoPlayInfo(videoItem.value!, {
    resource,
    episode,
  });
  await getPlayUrl();
}
const getPlayUrl = createCancellableFunction(async (signal: AbortSignal) => {
  if (!playingResource.value || !playingEpisode.value || !videoItem.value) {
    return;
  }
  let url;
  const t = displayStore.showToast();
  try {
    url = await store.videoPlay(
      videoSource.value!,
      videoItem.value,
      playingResource.value,
      playingEpisode.value,
    );
  } catch (error) {
    console.error('get video play url error', error);
  }
  displayStore.closeToast(t);

  if (signal.aborted) return;
  if (url) {
    videoSrc.value = url;
  } else {
    showFailToast('播放地址获取失败');
  }
});

async function onCanPlay(args: any) {
  if (playingEpisode.value?.lastWatchPosition) {
    videoPlayer.value?.currentTime(playingEpisode.value.lastWatchPosition);
  }
  if (route.name === 'VideoDetail') {
    // 判断是否还在当前页面
    await videoPlayer.value?.play();
  } else {
    videoPlayer.value?.pause();
  }
}

async function playPrev(args: any) {
  if (
    !playingResource.value?.episodes ||
    !playingEpisode.value ||
    !videoItem.value
  ) {
    return;
  }
  updateVideoPlayInfo(0);
  const index = playingResource.value.episodes.findIndex(
    (item) => item.id == playingEpisode.value!.id,
  );

  if (index === undefined || index === -1) return;
  if (index === 0) {
    showToast('已经是第一集了');
    return;
  }
  await play(playingResource.value, playingResource.value.episodes[index - 1]);
}

async function playNext(args: any) {
  await onPlayFinished(args);
}

async function seek(offset: number) {
  if (!videoPlayer.value) return;
  videoPlayer.value?.currentTime(
    Math.max(
      Math.min(
        videoPlayer.value.duration(),
        videoPlayer.value.currentTime() + offset,
      ),
      0,
    ),
  );
}

async function toggleFullScreen(fullscreen: boolean) {
  displayStore.fullScreenMode = fullscreen;
}

async function onPlayFinished(args: any) {
  if (
    !playingResource.value?.episodes ||
    !playingEpisode.value ||
    !videoItem.value
  ) {
    return;
  }
  updateVideoPlayInfo(0);
  const index = playingResource.value.episodes.findIndex(
    (item) => item.id == playingEpisode.value!.id,
  );

  if (index === undefined || index === -1) return;
  if (index === playingResource.value.episodes.length - 1) {
    showToast('没有下一集了');
    return;
  }
  await play(playingResource.value, playingResource.value.episodes[index + 1]);
}
function onTimeUpdate(args: any) {
  updateVideoPlayInfo();
}

const updateVideoPlayInfo = _.throttle(
  (position?: number) => {
    if (position === undefined) {
      position = videoPlayer.value?.currentTime();
    }
    if (videoItem.value && playingEpisode.value && playingResource.value) {
      playingEpisode.value.lastWatchPosition = position;
      shelfStore.updateVideoPlayInfo(videoItem.value, {
        resource: playingResource.value,
        episode: playingEpisode.value,
        position,
      });
    }
  },
  1000,
  { leading: true, trailing: false },
);

watch(
  [() => videoId, () => sourceId],
  async () => {
    loadData();
  },
  { immediate: true },
);

onMounted(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
});
onActivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(false);
  }
  try {
    videoPlayer.value?.pause();
  } catch (error) {}
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppVideoDetail
        v-model:player="videoPlayer"
        :video-sources="videoSources"
        :video-source="videoSource"
        :video-item="videoItem"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        :play-or-pause="playOrPause"
        :play="play"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :play-prev="playPrev"
        :play-next="playNext"
        :seek="seek"
        :toggle-full-screen="toggleFullScreen"
        :on-can-play="onCanPlay"
        :on-play-finished="onPlayFinished"
      />
    </template>
    <template #desktop>
      <DesktopVideoDetail
        v-model:player="videoPlayer"
        :video-sources="videoSources"
        :video-source="videoSource"
        :video-item="videoItem"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        :play-or-pause="playOrPause"
        :play="play"
        :in-shelf="inShelf"
        :add-to-shelf="() => (showAddShelfSheet = true)"
        :play-prev="playPrev"
        :play-next="playNext"
        :seek="seek"
        :toggle-full-screen="toggleFullScreen"
        :on-can-play="onCanPlay"
        :on-play-finished="onPlayFinished"
      />
    </template>
    <van-action-sheet
      title="添加到收藏"
      v-model:show="showAddShelfSheet"
      :actions="addShelfActions"
    ></van-action-sheet>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
