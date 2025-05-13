<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@/extensions/video';
import type { VideoSource } from '@/types';
import type videojs from 'video.js';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import { router } from '@/router';
import { useDisplayStore, useStore, useVideoShelfStore } from '@/store';
import { retryOnFalse, sleep } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import MobileVideoDetail from '@/views/mobileView/video/VideoDetail.vue';
import WinVideoDetail from '@/views/windowsView/video/VideoDetail.vue';
import _ from 'lodash';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import { showLoadingToast, showNotify, showToast } from 'vant';
import { onActivated, onDeactivated, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { set_screen_orientation } from 'tauri-plugin-commands-api';

type VideoJsPlayer = ReturnType<typeof videojs>;

const { videoId, sourceId } = defineProps({
  videoId: String,
  sourceId: String,
});

const route = useRoute();
const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const videoPlayer = ref<VideoJsPlayer>();

const videoSource = ref<VideoSource>();
const videoItem = ref<VideoItem>();

const playingResource = ref<VideoResource>();
const playingEpisode = ref<VideoEpisode>();
const videoSrc = ref<VideoUrlMap>();
const videoSources = ref<import('video.js').default.Tech.SourceObject[]>([]);

watch(videoSrc, (_) => {
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
  }
});

const pageBody = ref<HTMLElement>();
const shouldLoad = ref(true);
const isLoading = ref(false);
const showAddDialog = ref(false);

function back() {
  shouldLoad.value = true;
  router.push({ name: 'Video' });
}
const loadData = retryOnFalse({
  onFailed: () => {
    isLoading.value = false;
    back();
  },
  onSuccess: () => {
    isLoading.value = false;
  },
})(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
    isLoading.value = true;
    videoSource.value = undefined;
    videoItem.value = undefined;
    videoSrc.value = undefined;
    playingResource.value = undefined;
    playingEpisode.value = undefined;

    if (!videoId) {
      return false;
    }
    const source = store.getVideoSource(sourceId!);
    if (!source) {
      showToast('源不存在或未启用');
      return false;
    }
    videoSource.value = source;
    const item = await store.getVideoItem(source, videoId!);
    if (signal.aborted) return false;
    if (!item) {
      return false;
    }
    videoItem.value = item;
    const toast = showLoadingToast({
      message: '加载中',
      duration: 0,
      closeOnClick: true,
      closeOnClickOverlay: false,
    });
    const detail = (await store.videoDetail(source!, item)) || undefined;
    if (detail?.id != videoItem.value?.id) {
      toast.close();
      return false;
    }

    videoItem.value = detail;
    if (!videoItem.value || signal.aborted) {
      toast.close();
      return false;
    }
    toast.close();
    playingResource.value ||=
      videoItem.value.resources?.find(
        (item) => item.id == videoItem.value?.lastWatchResourceId,
      ) || videoItem.value.resources?.[0];
    playingEpisode.value ||=
      playingResource.value?.episodes?.find(
        (item) => item.id == videoItem.value?.lastWatchEpisodeId,
      ) || playingResource.value?.episodes?.[0];
    if (signal.aborted) return false;
    if (playingResource.value && playingEpisode.value) {
      await getPlayUrl();
    }
    if (!playingResource.value) {
      shouldLoad.value = true;
    }
    return true;
  }),
);
async function play(resource: VideoResource, episode: VideoEpisode) {
  pageBody?.value?.scrollTo({ top: 0, behavior: 'smooth' });
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
  const toast = showLoadingToast({
    message: '加载中',
    duration: 0,
    closeOnClick: true,
    closeOnClickOverlay: false,
  });
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
  toast.close();

  if (signal.aborted) return;
  if (url) {
    videoSrc.value = url;
  } else {
    showNotify('播放地址获取失败');
  }
});

async function onCanPlay(args: any) {
  if (playingEpisode.value?.lastWatchPosition) {
    videoPlayer.value?.currentTime(playingEpisode.value.lastWatchPosition);
  }
  if (route.path.includes('/video/detail/')) {
    // 判断是否还在当前页面
    await videoPlayer.value?.play();
  } else {
    await videoPlayer.value?.pause();
  }
}

async function playNext(args: any) {
  await onPlayFinished(args);
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

function collect() {
  if (!videoItem.value) {
    return;
  }
  if (shelfStore.videoShelf.length === 1) {
    addVideoToShelf(shelfStore.videoShelf[0].id);
  } else {
    showAddDialog.value = true;
  }
}
function addVideoToShelf(shelfId: string) {
  const res = shelfStore.addToViseoSelf(videoItem.value!, shelfId);
  if (res) {
    showAddDialog.value = false;
  }
}

watch([() => videoId, () => sourceId], async () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});

onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  } else {
    if (!isLoading.value) {
      if (!playingResource.value || !playingEpisode.value) {
        // 没有数据的话进行加载
        shouldLoad.value = false;
        loadData();
      }
    }
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
onMounted(() => {
  displayStore.addBackCallback('VideoDetail', async () => {
    if (displayStore.fullScreenMode) {
      // 退出全屏模式
      displayStore.fullScreenMode = false;
      displayStore.showTabBar = true;
      await set_screen_orientation('portrait');
      return;
    } else if (displayStore.showVideoShelf) {
      // 关闭收藏
      displayStore.showVideoShelf = false;
      return;
    } else {
      router.push({ name: 'Video' });
      return;
    }
  });
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileVideoDetail
        v-model:player="videoPlayer"
        v-model:show-add-dialog="showAddDialog"
        v-model:page-body="pageBody"
        :video-sources="videoSources"
        :video-source="videoSource"
        :video-item="videoItem"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        @back="back"
        @collect="collect"
        @play="play"
        @add-video-to-shelf="addVideoToShelf"
        @can-play="onCanPlay"
        @play-next="playNext"
        @on-play-finished="onPlayFinished"
        @time-update="onTimeUpdate"
      />
    </template>
    <template #windows>
      <WinVideoDetail
        v-model:player="videoPlayer"
        v-model:show-add-dialog="showAddDialog"
        v-model:page-body="pageBody"
        :video-sources="videoSources"
        :video-source="videoSource"
        :video-item="videoItem"
        :playing-resource="playingResource"
        :playing-episode="playingEpisode"
        :video-src="videoSrc"
        @back="back"
        @collect="collect"
        @play="play"
        @add-video-to-shelf="addVideoToShelf"
        @can-play="onCanPlay"
        @play-next="playNext"
        @on-play-finished="onPlayFinished"
        @time-update="onTimeUpdate"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
