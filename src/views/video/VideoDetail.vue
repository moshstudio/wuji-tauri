<script setup lang="ts">
import {
  ref,
  shallowRef,
  watch,
  onActivated,
  onDeactivated,
  onUnmounted,
  onMounted,
  nextTick,
} from 'vue';
import PlatformSwitch from '@/components/PlatformSwitch.vue';
import WinVideoDetail from '@/views/windowsView/video/VideoDetail.vue';
import MobileVideoDetail from '@/views/mobileView/video/VideoDetail.vue';
import { router } from '@/router';
import { useDisplayStore, useStore, useVideoShelfStore } from '@/store';
import { VideoSource } from '@/types';
import {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@/extensions/video';
import { retryOnFalse, sleep } from '@/utils';
import { createCancellableFunction } from '@/utils/cancelableFunction';
import { showLoadingToast, showNotify, showToast } from 'vant';
import _ from 'lodash';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { keepScreenOn } from 'tauri-plugin-keep-screen-on-api';
import videojs from 'video.js';
type VideoJsPlayer = ReturnType<typeof videojs>;

const { videoId, sourceId } = defineProps({
  videoId: String,
  sourceId: String,
});

const store = useStore();
const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const videoPlayer = ref<VideoJsPlayer>();

const videoSource = ref<VideoSource>();
const videoItem = ref<VideoItem>();

const playingResource = ref<VideoResource>();
const playingEpisode = ref<VideoEpisode>();
const videoSrc = ref<VideoUrlMap>();

const shouldLoad = ref(true);
const showAddDialog = ref(false);

function back() {
  shouldLoad.value = true;
  router.push({ name: 'Video' });
}
const loadData = retryOnFalse({ onFailed: back })(
  createCancellableFunction(async (signal: AbortSignal, pageNo?: number) => {
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
    videoItem.value = (await store.videoDetail(source!, item)) || undefined;
    if (!videoItem.value) {
      toast.close();
      return false;
    }
    toast.close();
    playingResource.value ||=
      videoItem.value.resources?.find(
        (item) => item.id == videoItem.value?.lastWatchResourceId
      ) || videoItem.value.resources?.[0];
    playingEpisode.value ||=
      playingResource.value?.episodes?.find(
        (item) => item.id == videoItem.value?.lastWatchEpisodeId
      ) || playingResource.value?.episodes?.[0];
    if (playingResource.value && playingEpisode.value) {
      await getPlayUrl();
    }
    return true;
  })
);
const play = async (resource: VideoResource, episode: VideoEpisode) => {
  playingResource.value = resource;
  playingEpisode.value = episode;
  shelfStore.updateVideoPlayInfo(videoItem.value!, {
    resource,
    episode,
  });
  await getPlayUrl();
};
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
      playingEpisode.value
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

const onCanPlay = async (args: any) => {
  if (playingEpisode.value?.lastWatchPosition) {
    videoPlayer.value?.currentTime(playingEpisode.value.lastWatchPosition);
  }
  await videoPlayer.value?.play();
};
const onTimeUpdate = (args: any) => {
  updateVideoPlayInfo();
};

const updateVideoPlayInfo = _.throttle(
  () => {
    const position = videoPlayer.value?.currentTime();
    if (
      position &&
      videoItem.value &&
      playingEpisode.value &&
      playingResource.value
    ) {
      shelfStore.updateVideoPlayInfo(videoItem.value, {
        resource: playingResource.value,
        episode: playingEpisode.value,
        position: position,
      });
    }
  },
  1000,
  { leading: true, trailing: false }
);

const collect = () => {
  if (!videoItem.value) {
    return;
  }
  if (shelfStore.videoShelf.length === 1) {
    addVideoToShelf(shelfStore.videoShelf[0].id);
  } else {
    showAddDialog.value = true;
  }
};
const addVideoToShelf = (shelfId: string) => {
  const res = shelfStore.addToViseoSelf(videoItem.value!, shelfId);
  if (res) {
    showAddDialog.value = false;
  }
};

watch([() => videoId, () => sourceId], () => {
  shouldLoad.value = false; // watch这里优先load
  loadData();
});
onActivated(async () => {
  await sleep(200);
  if (shouldLoad.value) {
    shouldLoad.value = false;
    loadData();
  }
});
// onDeactivated(() => {
//   videoPlayer.value?.pause();
// });

onActivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(true);
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid) {
    keepScreenOn(false);
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #mobile>
      <MobileVideoDetail
        v-model:player="videoPlayer"
        v-model:show-add-dialog="showAddDialog"
        :videoSource="videoSource"
        :videoItem="videoItem"
        :playingResource="playingResource"
        :playingEpisode="playingEpisode"
        :videoSrc="videoSrc"
        @back="back"
        @collect="collect"
        @play="play"
        @add-video-to-shelf="addVideoToShelf"
        @can-play="onCanPlay"
        @time-update="onTimeUpdate"
      ></MobileVideoDetail>
    </template>
    <template #windows>
      <WinVideoDetail
        v-model:player="videoPlayer"
        v-model:show-add-dialog="showAddDialog"
        :videoSource="videoSource"
        :videoItem="videoItem"
        :playingResource="playingResource"
        :playingEpisode="playingEpisode"
        :videoSrc="videoSrc"
        @back="back"
        @collect="collect"
        @play="play"
        @add-video-to-shelf="addVideoToShelf"
        @can-play="onCanPlay"
        @time-update="onTimeUpdate"
      ></WinVideoDetail>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
