<script lang="ts" setup>
import type {
  VideoEpisode,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { VideoPlayerState } from '@videojs-player/vue';
import type videojs from 'video.js';
import { useDisplayStore } from '@/store';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { VideoPlayer } from '@videojs-player/vue';

import {
  hide_status_bar,
  set_screen_orientation,
} from 'tauri-plugin-commands-api';
import { showToast } from 'vant';
import { onActivated, onMounted, ref, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import 'video.js/dist/video-js.css';
import { getErrorDisplayHTML } from '@/components2/media/error';

type VideoJsPlayer = ReturnType<typeof videojs>;

const player = defineModel<VideoJsPlayer>('player');
const state = defineModel<VideoPlayerState>('state');

const videoDirection = defineModel<'vertical' | 'horizontal'>('direction');

const position = defineModel<number>('position');
const duration = defineModel<number>('duration');

// any-touch 或  vue-guesture motion-v

const props = defineProps<{
  videoSources: import('video.js').default.Tech.SourceObject[];
  videoSrc?: VideoUrlMap;
  resource?: VideoResource;
  episode?: VideoEpisode;
  onCanPlay: (args: any) => void;
  onPlayFinished: (args: any) => void;
}>();

const displayStore = useDisplayStore();
const route = useRoute();

const checkVideoDirection = () => {
  // 判断是不是竖向视频
  const width = player.value?.videoWidth() || 0;
  const height = player.value?.videoHeight() || 0;
  if (width <= height) {
    videoDirection.value = 'vertical';
  } else {
    videoDirection.value = 'horizontal';
  }
};

const videoWrapper = ref<HTMLElement | null>(null);
const controlBarOptions = {
  volumePanel: false,
  playToggle: false,
  captionsButton: false,
  chaptersButton: false,
  subtitlesButton: false,
  remainingTimeDisplay: false,
  progressControl: false,
  fullscreenToggle: false,
  playbackRateMenuButton: false,
  pictureInPictureToggle: false,
  currentTimeDisplay: false,
  timeDivider: false,
  durationDisplay: false,
  liveDisplay: false,
  seekToLive: false,
  customControlSpacer: false,
  descriptionsButton: false,
  subsCapsButton: false,
  audioTrackButton: false,
};
function handleMounted(payload: any) {
  state.value = payload.state;
  player.value = payload.player;
}
function onFullScreenChange() {
  // 快捷键时会触发
}

async function requestFullScreen() {
  displayStore.fullScreenMode = true;
  displayStore.showTabBar = false;
  if (displayStore.isAndroid) {
    if (videoDirection.value === 'horizontal') {
      // 非纵向视频需自动横屏
      await set_screen_orientation('landscape');
    } else {
      await set_screen_orientation('portrait');
      await hide_status_bar();
    }
  } else {
    await getCurrentWindow().setFullscreen(true);
    videoWrapper.value?.focus();
  }
  videoWrapper.value?.focus();
}

function onLoadstart(args: any) {
  if (route.path.includes('/video-detail')) {
    // 判断是否还在当前页面
    player.value?.play();
  }
}

function onLoadedMetadata(args: any) {
  duration.value = player.value?.duration() || 0;
  checkVideoDirection();
  showToast('加载完成');
  props.onCanPlay(args);
}

// function quickForward(seconds: number) {
//   if (player.value) {
//     player.value.currentTime(
//       Math.min(player.value.currentTime() + seconds, player.value.duration()),
//     );
//     clearTimeout(showControlsTimer);
//     showControlsTimer = setTimeout(() => {
//       showControls.value = !showControls.value;
//     }, 6000);
//   }
// }

function onError(e: any) {
  // const error = player.value?.error();
  // if (error) {
  //   player.value!.errorDisplay.contentEl().innerHTML = getErrorDisplayHTML(
  //     error.code,
  //   );
  // }
}

onActivated(() => {
  if (props.videoSrc?.isLive) {
    // 直播自动播放
    player.value?.play();
  }
  checkVideoDirection();
});
</script>

<template>
  <VideoPlayer
    :options="{
      autoplay: false,
      controls: false,
      fluid: false,
    }"
    :sources="videoSources"
    playsinline
    :loop="false"
    crossorigin="anonymous"
    :control-bar="controlBarOptions"
    :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
    @loadstart="onLoadstart"
    @loadedmetadata="onLoadedMetadata"
    @ended="(args) => onPlayFinished(args)"
    @timeupdate="() => (position = player?.currentTime() || 0)"
    @mounted="handleMounted"
    @error="onError"
    @fullscreenchange="onFullScreenChange"
  ></VideoPlayer>
</template>

<style lang="less" scoped>
:deep(.vjs-tech) {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}
</style>
