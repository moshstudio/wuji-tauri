<script lang="ts" setup>
import type {
  VideoEpisode,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { VideoPlayerState } from '@videojs-player/vue';
import type videojs from 'video.js';
import type { PropType } from 'vue';
import { Icon } from '@iconify/vue';
import FullScreenButton from '@/components/media/FullScreenButton.vue';
import PlaybackRateButton from '@/components/media/PlaybackRateButton.vue';
import PlayPauseButton from '@/components/media/PlayPauseButton.vue';
import VideoProgressBar from '@/components/media/ProgressBar.vue';
import QuickSeekButton from '@/components/media/QuickSeekButton.vue';
import TimeShow from '@/components/media/TimeShow.vue';
import { useDisplayStore } from '@/store';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { VideoPlayer } from '@videojs-player/vue';
import { onBeforeUnmount, ref, shallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { clearTimeout, setTimeout } from 'worker-timers';
import BrowserFullScreenButton from './BrowserFullScreenButton.vue';
import PlayNextButton from './PlayNextButton.vue';
import 'video.js/dist/video-js.css';
import { getErrorDisplayHTML } from '@/components/media/error';

type VideoJsPlayer = ReturnType<typeof videojs>;

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
  (e: 'back'): void;
}>();
const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const isBrowserFullscreen = ref(false);
const displayStore = useDisplayStore();
const route = useRoute();
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
function handleMounted(payload: any) {
  state.value = payload.state;
  player.value = payload.player;
  try {
    player.value?.focus();
  } catch (error) {}
}

function onLoadstart(args: any) {
  emit('canPlay', args);
  // if (route.path.includes('/video/detail/')) {
  //   // 判断是否还在当前页面
  //   console.log('onLoadStart');

  //   player.value?.play();
  // }
}

function onLoadedMetadata(args: any) {
  // 刚刚加载过的视频将不会重复触发，但是onLoadstart会，所以放到那里去执行
  // emit('canPlay', args);
}

const showControls = ref(false);
let hideTimer: number | null = null;

function showControlsAction() {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
  showControls.value = true;
  // 设置新的定时器
  hideTimer = setTimeout(() => {
    showControls.value = false;
  }, 2500); // 2秒后隐藏
}

function onFullScreenChange() {
  if (!player.value?.isFullscreen()) {
    if (displayStore.fullScreenMode) {
      exitFullScreen();
    }
    if (isBrowserFullscreen.value) {
      exitBrowserFullscreen();
    }
  }
}
async function requestFullScreen() {
  displayStore.fullScreenMode = true;
  await getCurrentWindow().setFullscreen(true);
  player.value?.requestFullscreen();
  player.value?.focus();
}
async function exitFullScreen() {
  displayStore.fullScreenMode = false;
  await getCurrentWindow().setFullscreen(false);
  if (!isBrowserFullscreen.value) {
    player.value?.exitFullscreen();
  }
  player.value?.focus();
}
function requestBrowserFullscreen() {
  isBrowserFullscreen.value = true;
  player.value?.requestFullscreen();
  player.value?.focus();
}
function exitBrowserFullscreen() {
  isBrowserFullscreen.value = false;
  try {
    player.value?.exitFullscreen();
    player.value?.focus();
  } catch (error) {}
}

function quickForward(seconds: number) {
  if (player.value) {
    player.value.currentTime(
      Math.min(player.value.currentTime() + seconds, player.value.duration()),
    );
  }
}
function quickBackward(seconds: number) {
  if (player.value) {
    player.value.currentTime(Math.max(player.value.currentTime() - seconds, 0));
  }
}
function onError(e: any) {
  const error = player.value?.error();
  if (error) {
    player.value!.errorDisplay.contentEl().innerHTML = getErrorDisplayHTML(
      error.code,
    );
  }
}

async function onBack() {
  if (displayStore.fullScreenMode) {
    exitFullScreen();
  } else if (isBrowserFullscreen.value) {
    exitBrowserFullscreen();
  } else {
    emit('back');
  }
}

// 组件卸载时清除定时器
onBeforeUnmount(() => {
  if (hideTimer) {
    clearTimeout(hideTimer);
  }
});
</script>

<template>
  <div
    class="relative h-full w-full transition-all duration-500 ease-in-out"
    @mousemove="showControlsAction"
  >
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
      :volume="1"
      :control-bar="controlBarOptions"
      :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
      class="flex h-full w-full items-center"
      @fullscreenchange="onFullScreenChange"
      @loadstart="onLoadstart"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="(args) => emit('timeUpdate', args)"
      @ended="(args) => emit('onPlayFinished', args)"
      @mounted="handleMounted"
      @error="onError"
      @keydown.left="() => quickBackward(10)"
      @keydown.right="() => quickForward(10)"
    >
      <template
        #default="{
          player,
          state,
        }: {
          player: VideoJsPlayer;
          state: VideoPlayerState;
        }"
      >
        <div
          class="bg-mask absolute left-0 top-0 h-full w-full bg-transparent"
          @click="
            () => {
              state.playing ? player.pause() : player.play();
            }
          "
        >
          <div
            v-show="showControls"
            class="pointer-events-none h-full w-full bg-transparent"
          >
            <div
              class="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent"
            />
            <div
              class="top-bar absolute left-0 right-0 top-0 flex select-none bg-transparent p-2"
              @mousemove.stop="showControlsAction"
              @click.stop
            >
              <Icon
                icon="ic:round-arrow-back"
                width="24"
                height="24"
                class="van-haptics-feedback pointer-events-auto shrink-0"
                @click.stop="onBack"
              />
              <span class="truncate text-base text-gray-300">
                {{ episode?.title || '' }} - {{ resource?.title || '' }}
              </span>
            </div>

            <div
              class="control-bar pointer-events-auto absolute bottom-0 left-0 right-0 flex select-none flex-col gap-2 p-2"
              @mousemove.stop="showControlsAction"
              @click.stop
            >
              <VideoProgressBar
                v-show="!videoSrc?.isLive"
                :state="state"
                @seek="(time) => player.currentTime(time)"
              />

              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-4">
                  <PlayPauseButton
                    :is-playing="state.playing"
                    :play-or-pause="
                      () => {
                        state.playing ? player.pause() : player.play();
                      }
                    "
                  />
                  <PlayNextButton
                    v-if="resource && (resource.episodes?.length || 0) > 1"
                    :play-next="() => emit('playNext', {})"
                  />
                  <TimeShow :state="state" :is-playing="state.playing" />
                  <QuickSeekButton
                    :seconds="10"
                    :quick-forward="quickForward"
                    :quick-back="quickBackward"
                  />
                </div>
                <div class="flex items-center gap-4">
                  <PlaybackRateButton :state="state" :player="player" />
                  <BrowserFullScreenButton
                    :is-fullscreen="displayStore.fullScreenMode"
                    :is-browser-fullscreen="isBrowserFullscreen"
                    :request-browser-fullscreen="requestBrowserFullscreen"
                    :exit-browser-fullscreen="exitBrowserFullscreen"
                    :focus="() => player.focus()"
                  />
                  <FullScreenButton
                    :is-fullscreen="displayStore.fullScreenMode"
                    :request-fullscreen="requestFullScreen"
                    :exit-fullscreen="exitFullScreen"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </VideoPlayer>
  </div>
</template>

<style lang="less" scoped></style>
