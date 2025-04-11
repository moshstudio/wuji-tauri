<template>
  <div
    class="relative w-full h-full transition-all duration-500 ease-in-out"
    @mousemove="showControlsAction"
  >
    <video-player
      :options="{
        autoplay: true,
        controls: false,
        fluid: false,
      }"
      :sources="videoSources"
      playsinline
      :loop="false"
      crossorigin="anonymous"
      :volume="1"
      :control-bar="controlBarOptions"
      :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
      @fullscreenchange="onFullScreenChange"
      @loadedmetadata="(args) => emit('canPlay', args)"
      @timeupdate="(args) => emit('timeUpdate', args)"
      @ended="(args) => emit('onPlayFinished', args)"
      @mounted="handleMounted"
      @error="onError"
      class="flex w-full h-full items-center"
      @keydown.left="() => quickBackward(10)"
      @keydown.right="() => quickForward(10)"
    >
      <template
        v-slot="{
          player,
          state,
        }: {
          player: VideoJsPlayer;
          state: VideoPlayerState;
        }"
      >
        <div
          class="bg-mask absolute top-0 w-full h-full bg-transparent"
          @click="
            () => {
              state.playing ? player.pause() : player.play();
            }
          "
        >
          <div
            class="w-full h-full bg-transparent pointer-events-none"
            v-show="showControls"
          >
            <div
              class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
            ></div>
            <div
              class="top-bar absolute left-0 right-0 top-0 h-[40px] bg-transparent p-2 text-base text-gray-300 select-none truncate"
              @mousemove.stop="showControlsAction"
              @click.stop
            >
              {{ episode?.title || '' }} - {{ resource?.title || '' }}
            </div>

            <div
              class="control-bar absolute left-0 right-0 bottom-0 flex flex-col gap-2 p-2 pointer-events-auto select-none"
              @mousemove.stop="showControlsAction"
              @click.stop
            >
              <VideoProgressBar
                :state="state"
                @seek="(time) => player.currentTime(time)"
                v-show="!videoSrc?.isLive"
              ></VideoProgressBar>

              <div class="flex gap-2 items-center justify-between">
                <div class="flex items-center gap-4">
                  <PlayPauseButton
                    :is-playing="state.playing"
                    :play-or-pause="
                      () => {
                        state.playing ? player.pause() : player.play();
                      }
                    "
                  ></PlayPauseButton>
                  <PlayNextButton
                    :play-next="() => emit('playNext', {})"
                    v-if="resource && (resource.episodes?.length || 0) > 1"
                  ></PlayNextButton>
                  <TimeShow
                    :state="state"
                    :is-playing="state.playing"
                  ></TimeShow>
                  <QuickSeekButton
                    :seconds="10"
                    :quick-forward="quickForward"
                    :quick-back="quickBackward"
                  ></QuickSeekButton>
                </div>
                <div class="flex items-center gap-4">
                  <PlaybackRateButton
                    :state="state"
                    :player="player"
                  ></PlaybackRateButton>
                  <BrowserFullScreenButton
                    :is-fullscreen="displayStore.fullScreenMode"
                    :is-browser-fullscreen="isBrowserFullscreen"
                    :request-browser-fullscreen="requestBrowserFullscreen"
                    :exit-browser-fullscreen="exitBrowserFullscreen"
                    :focus="() => player.focus()"
                  ></BrowserFullScreenButton>
                  <FullScreenButton
                    :is-fullscreen="displayStore.fullScreenMode"
                    :request-fullscreen="requestFullScreen"
                    :exit-fullscreen="exitFullScreen"
                  ></FullScreenButton>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="absolute top-0 left-0 right-0 h-[40px] bg-transparent"
          v-if="!showControls"
          @mousemove.stop="showControlsAction"
        ></div>
        <div
          class="absolute bottom-0 left-0 right-0 h-[76px] bg-transparent"
          v-if="!showControls"
          @mousemove.stop="showControlsAction"
        ></div>
      </template>
    </video-player>
  </div>
</template>

<script lang="ts" setup>
import VideoProgressBar from '@/components/media/win/ProgressBar.vue';
import PlayPauseButton from '@/components/media/win/PlayPauseButton.vue';
import TimeShow from '@/components/media/win/TimeShow.vue';
import PlaybackRateButton from '@/components/media/win/PlaybackRateButton.vue';
import BrowserFullScreenButton from './BrowserFullScreenButton.vue';
import FullScreenButton from '@/components/media/win/FullScreenButton.vue';
import QuickSeekButton from '@/components/media/win/QuickSeekButton.vue';
import PlayNextButton from './PlayNextButton.vue';
import { onBeforeUnmount, PropType, ref, shallowRef, watch } from 'vue';
import videojs from 'video.js';
import { VideoPlayer, VideoPlayerState } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';
import { setTimeout, clearTimeout } from 'worker-timers';
import { useDisplayStore } from '@/store';
import { VideoEpisode, VideoResource, VideoUrlMap } from '@/extensions/video';
import { getCurrentWindow } from '@tauri-apps/api/window';
type VideoJsPlayer = ReturnType<typeof videojs>;

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const { videoSources, videoSrc, resource, episode } = defineProps({
  videoSrc: {
    type: Object as PropType<VideoUrlMap>,
  },
  videoSources: {
    type: Array as PropType<import('video.js').default.Tech.SourceObject[]>,
  },
  resource: {
    type: Object as PropType<VideoResource>,
  },
  episode: {
    type: Object as PropType<VideoEpisode>,
  },
});
const emit = defineEmits<{
  (e: 'canPlay', args: any): void;
  (e: 'onPlayFinished', args: any): void;
  (e: 'timeUpdate', args: any): void;
  (e: 'playNext', args: any): void;
}>();

const isBrowserFullscreen = ref(false);
const displayStore = useDisplayStore();
const state = shallowRef<VideoPlayerState>();
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
const handleMounted = (payload: any) => {
  state.value = payload.state;
  player.value = payload.player;
  try {
    player.value?.focus();
  } catch (error) {}
};

const showControls = ref(false);
let hideTimer: number | null = null;

const showControlsAction = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  showControls.value = true;
  // 设置新的定时器
  hideTimer = setTimeout(() => {
    showControls.value = false;
  }, 2500); // 2秒后隐藏
};

const onFullScreenChange = () => {
  if (!player.value?.isFullscreen()) {
    if (displayStore.fullScreenMode) {
      exitFullScreen();
    }
    if (isBrowserFullscreen.value) {
      exitBrowserFullscreen();
    }
  }
};
const requestFullScreen = async () => {
  displayStore.fullScreenMode = true;
  await getCurrentWindow().setFullscreen(true);
  player.value?.requestFullscreen();
  player.value?.focus();
};
const exitFullScreen = async () => {
  displayStore.fullScreenMode = false;
  await getCurrentWindow().setFullscreen(false);
  if (!isBrowserFullscreen.value) {
    player.value?.exitFullscreen();
  }
  player.value?.focus();
};
const requestBrowserFullscreen = () => {
  isBrowserFullscreen.value = true;
  player.value?.requestFullscreen();
  player.value?.focus();
};
const exitBrowserFullscreen = () => {
  isBrowserFullscreen.value = false;
  try {
    player.value?.exitFullscreen();
    player.value?.focus();
  } catch (error) {}
};

const quickForward = (seconds: number) => {
  if (player.value) {
    player.value.currentTime(
      Math.min(player.value.currentTime() + seconds, player.value.duration())
    );
  }
};
const quickBackward = (seconds: number) => {
  if (player.value) {
    player.value.currentTime(Math.max(player.value.currentTime() - seconds, 0));
  }
};
const onError = (e: any) => {
  player.value!.errorDisplay.contentEl().innerHTML = `
    <div class="vjs-error-display-custom pt-2">
      <div class="text-red">播放失败, 请重试</div>
    </div>
  `;
};

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});
</script>

<style lang="less" scoped></style>
