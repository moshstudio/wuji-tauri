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
import { showNotify, showToast } from 'vant';
import {
  computed,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import 'video.js/dist/video-js.css';
import { getErrorDisplayHTML } from '../error';

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
const route = useRoute();
const { fullScreenMode, isAndroid, androidOrientation } =
  storeToRefs(displayStore);

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const hammerManager = ref<HammerManager>();
const isVerticalView = ref(false); // 是不是竖向视频
const checkIfVerticalView = () => {
  // 判断是不是竖向视频
  const clientHeight = document.documentElement.clientHeight;
  const height = player.value?.currentHeight() || 0;
  if (height > clientHeight * 0.6) {
    isVerticalView.value = true;
  } else {
    isVerticalView.value = false;
  }
};

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
const isPressing = ref(false);

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
    if (!isVerticalView.value) {
      // 非纵向视频需自动横屏
      await set_screen_orientation('landscape');
    } else {
      await set_screen_orientation('portrait');
      await hide_status_bar();
    }
    if (isVerticalView.value) {
      updateGuesture(true);
    }
  } else {
    await getCurrentWindow().setFullscreen(true);
    player.value?.requestFullscreen();
  }
}
async function exitFullScreen() {
  fullScreenMode.value = false;
  if (displayStore.isAndroid) {
    displayStore.showTabBar = true;
    await set_screen_orientation('portrait');
    setTimeout(() => {
      checkIfVerticalView();
      if (isVerticalView.value) {
        updateGuesture(false);
      }
    }, 300);
  } else {
    await getCurrentWindow().setFullscreen(false);
    try {
      player.value?.exitFullscreen();
    } catch (error) {
      console.warn('exitFullScreen error', error);
    }
  }
}

function onLoadstart(args: any) {
  if (route.path.includes('/video/detail/')) {
    // 判断是否还在当前页面
    player.value?.play();
  }
}

function onLoadedMetadata(args: any) {
  if (displayStore.isAndroid) {
    if (!hammerManager.value) {
      mountAndroidGuesture();
    }
    checkIfVerticalView();
    if (isVerticalView.value && !fullScreenMode.value) {
      updateGuesture(false);
    } else {
      updateGuesture(true);
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
    clearTimeout(showControlsTimer);
    showControlsTimer = setTimeout(() => {
      showControls.value = !showControls.value;
    }, 6000);
  }
}
function quickBackward(seconds: number) {
  if (player.value) {
    player.value.currentTime(Math.max(player.value.currentTime() - seconds, 0));
    clearTimeout(showControlsTimer);
    showControlsTimer = setTimeout(() => {
      showControls.value = !showControls.value;
    }, 6000);
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
  if (fullScreenMode.value) {
    exitFullScreen();
  } else {
    emit('back');
  }
}

const guestureRecognizers: Record<string, Recognizer> = {
  tap: new Hammer.Tap({
    event: 'tap',
  }),
  dbtap: new Hammer.Tap({
    event: 'dbtap',
    taps: 2, // 需要两次点击
  }),
  press: new Hammer.Press({
    event: 'press',
    time: 400, // 长按时间阈值，单位毫秒（默认是500，可根据需要调整）
  }),
  panHorizontal: new Hammer.Pan({
    event: 'panHorizontal',
    direction: Hammer.DIRECTION_HORIZONTAL,
  }),
  panVertical: new Hammer.Pan({
    event: 'panVertical',
    direction: Hammer.DIRECTION_VERTICAL,
  }),
};

const _isTargetElement = (e: HTMLElement) => {
  // 只响应播放元素而不包括控制元素
  return e.classList.contains('vjs-tech') || e.classList.contains('bg-mask');
};

const guestureEventHandlers: Record<string, HammerListener> = {
  tap: (e) => {
    // 单击事件
    if (!_isTargetElement(e.target)) return;
    toggleShowControls();
    if (displayStore.fullScreenMode && displayStore.isAndroid) {
      hide_status_bar();
    }
  },
  dbtap: (e) => {
    // 双击事件
    if (!_isTargetElement(e.target)) return;
    togglePlay();
  },
  press: (e) => {
    if (!_isTargetElement(e.target)) return;
    if (videoSrc?.isLive) {
      // 直播不响应快进
      return;
    }
    player.value?.play();
    player.value?.playbackRate(2.0);
    isPressing.value = true;
  },
  pressup: (e) => {
    if (!_isTargetElement(e.target)) return;
    if (videoSrc?.isLive) {
      // 直播不响应快进
      return;
    }
    player.value?.playbackRate(1.0);
    isPressing.value = false;
  },
  presscancel: (e) => {
    if (!_isTargetElement(e.target)) return;
    if (videoSrc?.isLive) {
      // 直播不响应快进
      return;
    }
    player.value?.playbackRate(1.0);
    isPressing.value = false;
  },
  panHorizontalstart: (e) => {
    if (!_isTargetElement(e.target)) return;
    dragMovement.value = [e.deltaX, e.deltaY];
    isDragging.value = true;
    dragDirection.value = 'Horizontal';
  },
  panHorizontal: (e) => {
    if (!_isTargetElement(e.target)) return;
    dragMovement.value = [e.deltaX, e.deltaY];
  },
  panHorizontalend: (e) => {
    if (!_isTargetElement(e.target)) return;
    if (isPressing.value) return;
    // 开始调整进度
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
  },
  panVerticalstart: async (e) => {
    if (!_isTargetElement(e.target)) return;
    if (fullScreenMode.value && e.center.y < 100) return; // 最顶部不响应
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
  },
  panVertical: async (e) => {
    if (!_isTargetElement(e.target)) return;
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
        const volumeDistance = Math.ceil(-dragMovement.value[1] / 4); // / 2 来减小变化幅度
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
  },
  panVerticalend: async (e) => {
    if (!_isTargetElement(e.target)) return;
    isDragging.value = false;
    dragDirection.value = undefined;
    dragMovement.value = [0, 0];
  },
};

function updateGuesture(supportVertical: boolean) {
  if (supportVertical) {
    hammerManager.value?.set({ touchAction: 'none' });
    hammerManager.value?.add(guestureRecognizers.panVertical);
    hammerManager.value?.get('press').requireFailure('panVertical');
    hammerManager.value?.on(
      'panVerticalstart',
      guestureEventHandlers.panVerticalstart,
    );
    hammerManager.value?.on('panVertical', guestureEventHandlers.panVertical);
    hammerManager.value?.on(
      'panVerticalend',
      guestureEventHandlers.panVerticalend,
    );
  } else {
    hammerManager.value?.set({ touchAction: 'pan-y' });
    hammerManager.value?.off('panVerticalstart');
    hammerManager.value?.off('panVertical');
    hammerManager.value?.off('panVerticalend');
    hammerManager.value?.remove(guestureRecognizers.panVertical);
  }
}

function mountAndroidGuesture() {
  const element = document.querySelector('.video-container') as HTMLElement;
  if (!element) return;
  const manager = new Hammer.Manager(element, { touchAction: 'none' });
  hammerManager.value = manager;

  // 将识别器添加到管理器
  manager.add([
    guestureRecognizers.press,
    guestureRecognizers.dbtap,
    guestureRecognizers.tap,
    guestureRecognizers.panHorizontal,
    guestureRecognizers.panVertical,
  ]); // 注意顺序，双击识别器要先添加
  manager.get('tap').requireFailure('dbtap');
  manager.get('tap').requireFailure('press');
  manager.get('dbtap').requireFailure('press');
  manager.get('press').requireFailure('panHorizontal');
  manager.get('press').requireFailure('panVertical');
  Object.entries(guestureEventHandlers).forEach(([eventName, handler]) => {
    manager.on(eventName, handler);
  });
  const resetRate = () => {
    if (isPressing.value) {
      if (!videoSrc?.isLive) {
        player.value?.playbackRate(1.0);
      }
      isPressing.value = false;
    }
  };
  element.addEventListener('pointerup', resetRate);
  element.addEventListener('touchcancel', resetRate);

  return manager;
}
onMounted(() => {
  exitFullScreen();
});
if (displayStore.isAndroid) {
  /** 自动监听横屏时进入全屏 */
  watch(androidOrientation, (newValue, oldValue) => {
    if (
      newValue === 'landscape' &&
      oldValue !== 'landscape' &&
      !displayStore.fullScreenMode &&
      !isVerticalView.value
    ) {
      requestFullScreen();
    }
  });
}
onActivated(() => {
  if (videoSrc?.isLive) {
    // 直播自动播放
    player.value?.play();
  }
  if (displayStore.isAndroid) {
    if (!hammerManager.value) {
      mountAndroidGuesture();
    }
    checkIfVerticalView();
    if (isVerticalView.value && !fullScreenMode.value) {
      updateGuesture(false);
    } else {
      updateGuesture(true);
    }
  }
});
onDeactivated(() => {
  if (displayStore.isAndroid) {
    set_brightness(-1);
  }
});

onMounted(() => {
  displayStore.addBackCallback('VideoDetail', async () => {
    if (!hammerManager.value) {
      mountAndroidGuesture();
    }
    setTimeout(() => {
      checkIfVerticalView();
      if (isVerticalView.value && !fullScreenMode.value) {
        updateGuesture(false);
      } else {
        updateGuesture(true);
      }
    }, 300);
  });
});
</script>

<template>
  <div
    ref="videoWrapper"
    v-click-separate
    class="video-container transition-all duration-500 ease-in-out text-center bg-black"
    :class="
      fullScreenMode
        ? 'fixed z-[99999999] w-screen h-screen top-0 right-0 bottom-0 left-0 '
        : 'relative w-full h-auto'
    "
    autofocus
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
      :control-bar="controlBarOptions"
      :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
      class="my-video-player relative w-full flex flex-col items-center justify-center"
      :class="fullScreenMode ? ' h-full' : 'h-auto'"
      @loadstart="onLoadstart"
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
          v-if="isPressing"
          class="absolute top-5 left-[50%] -translate-x-[50%] text-base rounded p-1 text-gray-200 bg-black/10 select-none pointer-events-none"
        >
          <Icon icon="fluent-mdl2:fast-forward-two-x" width="24" height="24" />
        </div>
        <div
          v-show="showControls"
          class="absolute left-0 top-0 bg-mask w-full h-full bg-transparent"
        >
          <div
            class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
          />
          <div
            class="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
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
            v-if="fullScreenMode"
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
  height: none;
  max-height: calc(100vh - v-bind('fullScreenMode ? "0px" : "50px"'));
}
</style>
