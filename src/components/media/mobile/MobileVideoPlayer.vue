<script lang="ts" setup>
import type {
  VideoEpisode,
  VideoResource,
  VideoUrlMap,
} from '@/extensions/video';
import type { VideoPlayerState } from '@videojs-player/vue';
import type videojs from 'video.js';
import type { PropType } from 'vue';
import FullScreenButton from '@/components/media/mobile/MobileFullScreenButton.vue';
import MobileQuickSeekButton from '@/components/media/mobile/MobileQuickSeekButton.vue';
import PlaybackRateButton from '@/components/media/win/PlaybackRateButton.vue';
import PlayPauseButton from '@/components/media/win/PlayPauseButton.vue';
import VideoProgressBar from '@/components/media/win/ProgressBar.vue';
import TimeShow from '@/components/media/win/TimeShow.vue';
import { useDisplayStore } from '@/store';
import { Icon } from '@iconify/vue';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { VideoPlayer } from '@videojs-player/vue';
import Hammer from 'hammerjs';
import { storeToRefs } from 'pinia';
import {
  get_brightness,
  get_system_brightness,
  get_volume,
  hide_status_bar,
  set_brightness,
  set_screen_orientation,
  set_volume,
} from 'tauri-plugin-commands-api';
import { showToast } from 'vant';
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import 'video.js/dist/video-js.css';

type VideoJsPlayer = ReturnType<typeof videojs>;

const { videoSources, videoSrc, resource, episode } = defineProps({
  videoSources: {
    type: Array as PropType<import('video.js').default.Tech.SourceObject[]>,
  },
  videoSrc: {
    type: Object as PropType<VideoUrlMap>,
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
  (e: 'collect'): void;
}>();
const displayStore = useDisplayStore();
const { fullScreenMode, isAndroid, androidOrientation } =
  storeToRefs(displayStore);

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const hammerManager = ref<HammerManager>();

const state = shallowRef<VideoPlayerState>();
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
  if (displayStore.isAndroid) {
    hammerManager.value = mountAndroidGuesture();
  }
}

const showControls = ref(false);
let showControlsTimer: NodeJS.Timeout;
function toggleShowControls() {
  if (!showControls.value) {
    clearTimeout(showControlsTimer);
    showControls.value = !showControls.value;
    showControlsTimer = setTimeout(() => {
      showControls.value = !showControls.value;
    }, 6000);
  } else {
    clearTimeout(showControlsTimer);
    showControls.value = !showControls.value;
  }
}
function togglePlay() {
  player.value?.paused() ? player.value.play() : player.value?.pause();
}
const isDragging = ref(false);
const dragDirection = ref<'Horizontal' | 'VerticalLeft' | 'VerticalRight'>();
const dragMovement = ref<[number, number]>([0, 0]);

const initBrightness = ref(0); // 0-100
const currentBrightness = ref(0); // 0-100
if (displayStore.isAndroid) {
  get_system_brightness().then((brightness) => {
    initBrightness.value = Math.ceil((brightness / 255) * 100);
    currentBrightness.value = Math.ceil((brightness / 255) * 100);
  });
}
const initVolume = ref(0); // 0-100
const currentVolume = ref(0); // 0-100
if (displayStore.isAndroid) {
  get_volume().then((volume) => {
    initVolume.value = volume;
    currentVolume.value = volume;
  });
}

const dragHint = computed(() => {
  if (dragDirection.value == undefined) return '';
  if (dragDirection.value == 'Horizontal') {
    return `${dragMovement.value[0] > 0 ? '快进' : '快退'} ${Math.abs(
      Math.floor(dragMovement.value[0]),
    )} 秒`;
  } else if (dragDirection.value == 'VerticalLeft') {
    return `亮度 ${currentBrightness.value} %`;
  } else if (dragDirection.value == 'VerticalRight') {
    return `音量 ${currentVolume.value} %`;
  }
});

const vClickSeparate = {
  mounted(el: Element) {
    let clickCount = 0;
    let timer: NodeJS.Timeout;
    if (!displayStore.isAndroid) {
      el.addEventListener('click', () => {
        if (dragDirection.value != undefined) {
          return;
        }
        clickCount++;
        if (clickCount === 1) {
          timer = setTimeout(() => {
            clickCount = 0;
            toggleShowControls(); // 触发单击
          }, 300);
        } else if (clickCount === 2) {
          clickCount = 0;
          clearTimeout(timer);
          togglePlay(); // 触发双击
        }
      });
    }
  },
};

function onFullScreenChange() {
  // 快捷键时会触发
  if (player.value?.isFullscreen()) {
    requestFullScreen();
  } else {
    exitFullScreen();
  }
}

async function requestFullScreen() {
  displayStore.fullScreenMode = true;
  if (displayStore.isAndroid) {
    displayStore.showTabBar = false;
    if (
      (player.value?.currentHeight() || 0) -
        (player.value?.currentWidth() || 0) <=
      20
    ) {
      // 非竖屏模式自动横屏
      await set_screen_orientation('landscape');
    } else {
      await set_screen_orientation('portrait');
      await hide_status_bar();
    }
  } else {
    await getCurrentWindow().setFullscreen(true);
    player.value?.requestFullscreen();
  }
}
async function exitFullScreen() {
  displayStore.fullScreenMode = false;
  if (displayStore.isAndroid) {
    displayStore.showTabBar = true;
    await set_screen_orientation('portrait');
  } else {
    await getCurrentWindow().setFullscreen(false);
    try {
      player.value?.exitFullscreen();
    } catch (error) {
      console.warn('exitFullScreen error', error);
    }
  }
}

function onLoadedMetadata(args: any) {
  if (displayStore.isAndroid) {
    if (
      (player.value?.currentHeight() || 0) -
        (player.value?.currentWidth() || 0) <=
      20
    ) {
      // 宽屏
      hammerManager.value?.destroy();
      hammerManager.value = mountAndroidGuesture(true);
    } else {
      // 竖屏
      hammerManager.value?.destroy();
      hammerManager.value = mountAndroidGuesture(false);
    }
  }
  showToast('加载完成');
  emit('canPlay', args);
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
  player.value!.errorDisplay.contentEl().innerHTML = `
    <div class="vjs-error-display-custom pt-2">
      <div class="text-red">播放失败, 请重试</div>
    </div>
  `;
}

async function onBack() {
  if (fullScreenMode.value) {
    exitFullScreen();
  } else {
    emit('back');
  }
}

function mountAndroidGuesture(needPan = true) {
  const isTargetElement = (e: HTMLElement) => {
    return e.classList.contains('vjs-tech') || e.classList.contains('bg-mask');
  };
  const element = document.querySelector('.video-container') as HTMLElement;
  const manager = new Hammer.Manager(element);
  // 添加双击识别器
  const dbtap = new Hammer.Tap({
    event: 'dbtap',
    taps: 2, // 需要两次点击
  });
  // 添加单击识别器，并设置 requireFailure 让它在双击时不触发
  const tap = new Hammer.Tap({
    event: 'tap',
  });
  // 将识别器添加到管理器
  manager.add([dbtap, tap]); // 注意顺序，双击识别器要先添加
  manager.get('tap').requireFailure('dbtap');
  if (needPan) {
    const panHorizontal = new Hammer.Pan({
      event: 'panHorizontal',
      direction: Hammer.DIRECTION_HORIZONTAL,
    });
    const panVertical = new Hammer.Pan({
      event: 'panVertical',
      direction: Hammer.DIRECTION_VERTICAL,
    });
    manager.add([panHorizontal, panVertical]);
  } else {
    // manager.get('pan').set({ direction: Hammer.DIRECTION_VERTICAL });
    manager.on('pan', (event) => {
      if (event.direction === Hammer.DIRECTION_VERTICAL) {
        // 允许垂直滚动
        event.preventDefault();
      }
    });
  }

  manager.on('tap', (e) => {
    // 单击事件
    if (isTargetElement(e.target)) {
      toggleShowControls();
    }
    if (displayStore.fullScreenMode && displayStore.isAndroid) {
      hide_status_bar();
    }
  });
  manager.on('dbtap', (e) => {
    // 双击事件
    if (isTargetElement(e.target)) {
      togglePlay();
    }
  });
  if (needPan) {
    manager.on('panHorizontalstart', (e) => {
      if (!isTargetElement(e.target)) return;
      dragMovement.value = [e.deltaX, e.deltaY];
      isDragging.value = true;
      dragDirection.value = 'Horizontal';
    });
    manager.on('panHorizontal', (e) => {
      if (!isTargetElement(e.target)) return;
      dragMovement.value = [e.deltaX, e.deltaY];
    });
    manager.on('panHorizontalend', (e) => {
      // 开始调整进度
      if (!isTargetElement(e.target)) return;
      dragMovement.value = [e.deltaX, e.deltaY];
      const offset = dragMovement.value[0];
      const currTime = player.value?.currentTime();
      if (currTime && offset != 0) {
        player.value?.currentTime(
          Math.min(player?.value.duration(), Math.max(0, currTime + offset)),
        );
      }
      isDragging.value = false;
      dragDirection.value = undefined;
      dragMovement.value = [0, 0];
    });
    manager.on('panVerticalstart', async (e) => {
      if (e.center.y < 100) return; // 最顶部不响应
      if (!isTargetElement(e.target)) return;
      dragMovement.value = [e.deltaX, e.deltaY];
      isDragging.value = true;
      const middle = (videoWrapper.value?.clientWidth || 0) / 2;
      const startV = e.center.x;
      if (startV < middle) {
        // 左侧调整亮度
        dragDirection.value = 'VerticalLeft';
        let brightness = await get_brightness();
        if (brightness === -1) {
          brightness = (await get_system_brightness()) / 255;
        }
        initBrightness.value = Math.ceil(brightness * 100);
        currentBrightness.value = Math.ceil(brightness * 100);
      } else {
        // 右侧调整音量
        dragDirection.value = 'VerticalRight';
        const volume = await get_volume();
        initVolume.value = volume;
        currentVolume.value = volume;
      }
    });
    manager.on('panVertical', async (e) => {
      if (!isTargetElement(e.target)) return;
      dragMovement.value = [e.deltaX, e.deltaY];
      switch (dragDirection.value) {
        case 'VerticalLeft':
          // 亮度实时变化
          const distance = Math.ceil(-dragMovement.value[1] / 2); // / 2 来减小变化幅度
          const percentage = Math.max(
            0,
            Math.min(100, Math.ceil(initBrightness.value + distance)),
          );
          if (
            currentBrightness.value - percentage >= 5 ||
            (currentBrightness.value != percentage && percentage % 5 === 0)
          ) {
            currentBrightness.value = percentage;
            await set_brightness(percentage / 100);
          }
          break;
        case 'VerticalRight':
          // 音量实时变化
          const volumeDistance = Math.ceil(-dragMovement.value[1] / 2); // / 2 来减小变化幅度
          const volume = Math.max(
            0,
            Math.min(100, initVolume.value + volumeDistance),
          );
          if (currentVolume.value != volume) {
            currentVolume.value = volume;
            await set_volume(volume);
          }
          break;
      }
    });
    manager.on('panVerticalend', async (e) => {
      if (!isTargetElement(e.target)) return;
      isDragging.value = false;
      dragDirection.value = undefined;
      dragMovement.value = [0, 0];
    });
  }

  return manager;
}
onMounted(() => {
  exitFullScreen();
});
if (displayStore.isAndroid) {
  /** 自动横屏时进入全屏 */
  watch(androidOrientation, (newValue, oldValue) => {
    if (
      newValue === 'landscape' &&
      oldValue !== 'landscape' &&
      !displayStore.fullScreenMode
    ) {
      if (
        (player.value?.currentHeight() || 0) -
          (player.value?.currentWidth() || 0) <=
        20
      ) {
        // 非竖屏模式自动横屏
        requestFullScreen();
      }
    }
  });
}
onActivated(() => {
  if (videoSrc?.isLive) {
    // 直播自动播放
    player.value?.play();
  }
  if (displayStore.isAndroid) {
    if (
      (player.value?.currentHeight() || 0) -
        (player.value?.currentWidth() || 0) <=
      20
    ) {
      // 宽屏
      hammerManager.value?.destroy();
      hammerManager.value = mountAndroidGuesture(true);
    } else {
      // 竖屏
      hammerManager.value?.destroy();
      hammerManager.value = mountAndroidGuesture(false);
    }
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid) {
    set_brightness(-1);
  }
});
</script>

<template>
  <div
    ref="videoWrapper"
    v-click-separate
    class="video-container transition-all duration-500 ease-in-out text-center bg-black"
    :class="
      fullScreenMode
        ? 'absolute z-[99999999] w-screen h-screen '
        : 'relative w-full h-auto'
    "
    autofocus
  >
    <VideoPlayer
      :options="{
        autoplay: true,
        controls: false,
        fluid: false,
      }"
      :sources="videoSources"
      playsinline
      :loop="false"
      crossorigin="anonymous"
      :control-bar="controlBarOptions"
      :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
      class="my-video-player relative w-full flex flex-col items-center justify-center"
      :class="fullScreenMode ? ' h-full' : 'h-auto'"
      @loadedmetadata="onLoadedMetadata"
      @ended="(args) => emit('onPlayFinished', args)"
      @timeupdate="(args) => emit('timeUpdate', args)"
      @mounted="handleMounted"
      @error="onError"
      @fullscreenchange="onFullScreenChange"
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
          v-if="isDragging && dragDirection"
          class="absolute top-20 left-[50%] -translate-x-[50%] text-base rounded p-1 text-gray-200 bg-black/50 select-none pointer-events-none"
        >
          {{ dragHint }}
        </div>
        <div
          v-show="showControls"
          class="absolute bg-mask w-full h-full bg-transparent"
        >
          <div
            class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
          />
          <div
            class="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/90 to-transparent pointer-events-none"
          />

          <div
            class="top-bar absolute left-0 right-0 top-0 bg-transparent flex p-2 text-sm text-gray-300 select-none truncate"
          >
            <div class="flex gap-2 items-center">
              <Icon
                icon="ic:round-arrow-back"
                width="24"
                height="24"
                class="van-haptics-feedback pointer-events-auto"
                @click.stop="onBack"
              />
              <p>{{ episode?.title || '' }} - {{ resource?.title || '' }}</p>
            </div>
          </div>
          <MobileQuickSeekButton
            v-show="!videoSrc?.isLive"
            :seconds="10"
            :quick-forward="quickForward"
            :quick-back="quickBackward"
            class="absolute left-0 right-0 bottom-[50%]"
          />
          <div
            class="control-bar absolute left-0 right-0 bottom-0 flex flex-col gap-2 p-2 pointer-events-auto select-none"
            @click.stop
          >
            <VideoProgressBar
              v-show="!videoSrc?.isLive"
              :state="state"
              @seek="(time) => player.currentTime(time)"
            />

            <div class="flex gap-2 items-center justify-between">
              <div class="flex items-center gap-2">
                <PlayPauseButton
                  :is-playing="state.playing"
                  :play-or-pause="
                    () => {
                      state.playing ? player.pause() : player.play();
                    }
                  "
                />
                <TimeShow :state="state" :is-playing="state.playing" />
              </div>
              <div class="flex items-center gap-2">
                <PlaybackRateButton
                  v-show="!videoSrc?.isLive"
                  :state="state"
                  :player="player"
                />
                <FullScreenButton
                  :is-fullscreen="fullScreenMode"
                  :request-fullscreen="requestFullScreen"
                  :exit-fullscreen="exitFullScreen"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </VideoPlayer>
  </div>
</template>

<style lang="less" scoped>
:deep(.vjs-tech) {
  position: unset;
  height: auto;
  max-height: calc(100vh - v-bind('fullScreenMode ? "0px" : "50px"'));
}
</style>
