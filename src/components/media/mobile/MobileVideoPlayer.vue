<template>
  <div
    ref="videoWrapper"
    class="video-container rounded-none transition-all duration-500 ease-in-out text-center"
    :class="
      fullScreenMode
        ? 'fixed z-[99999999] w-screen h-screen '
        : 'relative w-full h-full'
    "
    autofocus
    v-click-separate
  >
    <video-player
      :src="src"
      playsinline
      :loop="false"
      crossorigin="anonymous"
      :control-bar="false"
      :height="320"
      :playback-rates="[0.5, 0.75, 1.0, 1.25, 1.5, 2.0]"
      @loadedmetadata="(args) => emit('canPlay', args)"
      @ended="(args) => emit('onPlayFinished', args)"
      @timeupdate="(args) => emit('timeUpdate', args)"
      @mounted="handleMounted"
      @error="onError"
      @fullscreenchange="onFullScreenChange"
      class="relative video-player flex w-full h-full items-center z-[99998]"
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
          class="absolute top-20 left-[50%] -translate-x-[50%] text-base rounded p-1 text-gray-200 bg-black/50 select-none pointer-events-none"
          v-if="isDragging && dragDirection"
        >
          {{ dragHint }}
        </div>
        <div
          class="bg-mask w-full h-full bg-transparent pointer-events-none"
          v-show="showControls"
        >
          <div
            class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent pointer-events-none"
          ></div>

          <div
            class="top-bar absolute left-0 right-0 top-0 h-[40px] bg-transparent flex p-2 text-sm text-gray-300 select-none"
          >
            {{ episode?.title || '' }}
          </div>
          <MobileQuickSeekButton
            :seconds="10"
            :quick-forward="quickForward"
            :quick-back="quickBackward"
            class="absolute left-0 right-0 bottom-[50%]"
          ></MobileQuickSeekButton>
          <div
            class="control-bar absolute left-0 right-0 bottom-0 flex flex-col gap-2 p-2 pointer-events-auto select-none"
            @click.stop
          >
            <VideoProgressBar
              :state="state"
              @seek="(time) => player.currentTime(time)"
            ></VideoProgressBar>

            <div class="flex gap-2 items-center justify-between">
              <div class="flex items-center gap-2">
                <PlayPauseButton
                  :is-playing="state.playing"
                  :play-or-pause="
                    () => {
                      state.playing ? player.pause() : player.play();
                    }
                  "
                ></PlayPauseButton>
                <TimeShow :state="state" :is-playing="state.playing"></TimeShow>
              </div>
              <div class="flex items-center gap-2">
                <PlaybackRateButton
                  :state="state"
                  :player="player"
                ></PlaybackRateButton>
                <FullScreenButton
                  :state="state"
                  :player="player"
                  :video-wrapper="videoWrapper"
                ></FullScreenButton>
              </div>
            </div>
          </div>
        </div>
        <!-- <div
          class="drag-mask absolute w-full h-full bg-amber-800/50 select-none pointer-events-none"
        >
          
        </div> -->
      </template>
    </video-player>
  </div>
</template>

<script lang="ts" setup>
import VideoProgressBar from '@/components/media/win/ProgressBar.vue';
import PlayPauseButton from '@/components/media/win/PlayPauseButton.vue';
import TimeShow from '@/components/media/win/TimeShow.vue';
import PlaybackRateButton from '@/components/media/win/PlaybackRateButton.vue';
import FullScreenButton from '@/components/media/mobile/MobileFullScreenButton.vue';
import MobileQuickSeekButton from '@/components/media/mobile/MobileQuickSeekButton.vue';
import {
  PropType,
  ref,
  shallowRef,
  onMounted,
  nextTick,
  computed,
  watch,
} from 'vue';
import Hammer from 'hammerjs';
import videojs from 'video.js';
import { VideoPlayer, VideoPlayerState } from '@videojs-player/vue';
import 'video.js/dist/video-js.css';
import { useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { hide_status_bar } from 'tauri-plugin-commands-api';
import { showNotify } from 'vant';
import { VideoEpisode } from '@/extensions/video';
import { DragState, useGesture } from '@vueuse/gesture';
import { sleep } from '@/utils';

type VideoJsPlayer = ReturnType<typeof videojs>;

const displayStore = useDisplayStore();
const { fullScreenMode } = storeToRefs(displayStore);

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const { src } = defineProps({
  src: {
    type: String,
  },
  episode: {
    type: Object as PropType<VideoEpisode>,
  },
});

const emit = defineEmits<{
  (e: 'canPlay', args: any): void;
  (e: 'onPlayFinished', args: any): void;
  (e: 'timeUpdate', args: any): void;
}>();

const state = shallowRef<VideoPlayerState>();
const videoWrapper = ref<HTMLElement | null>(null);
const handleMounted = (payload: any) => {
  state.value = payload.state;
  player.value = payload.player;
};

const showControls = ref(false);

const toggleShowControls = () => {
  showControls.value = !showControls.value;
};
const togglePlay = () => {
  player.value?.paused() ? player.value.play() : player.value?.pause();
};
const isDragging = ref(false);
const dragDirection = ref<'Horizontal' | 'Vertical'>();
const dragMovement = ref<[number, number]>([0, 0]);
const dragHint = computed(() => {
  if (dragDirection.value == undefined) return '';
  if (dragDirection.value == 'Horizontal') {
    return `${dragMovement.value[0] > 0 ? '快进' : '快退'} ${Math.abs(
      Math.floor(dragMovement.value[0])
    )} 秒`;
  } else if (dragDirection.value == 'Vertical') {
    return '';
    // return `音量 ${dragMovement.value[0] > 0 ? '-' : '+'} ${Math.abs(
    //   dragMovement.value[0]
    // )} %`;
  }
});

const mountGuesture = () => {
  useGesture(
    {
      onDragStart: (state) => {
        dragMovement.value = [state.movement[0], state.movement[1]];
        isDragging.value = true;
        dragDirection.value = undefined;
      },
      onDrag: (state) => {
        dragMovement.value = [state.movement[0], state.movement[1]];
        const threshold = 20;
        if (
          Math.abs(state.movement[0]) < threshold &&
          Math.abs(state.movement[1]) < threshold
        ) {
          return;
        }
        if (dragDirection.value == undefined) {
          dragDirection.value =
            Math.abs(dragMovement.value[0]) > Math.abs(dragMovement.value[1])
              ? 'Horizontal'
              : 'Vertical';
        }
      },
      onDragEnd: async (state) => {
        dragMovement.value = [state.movement[0], state.movement[1]];
        await sleep(100);
        let offset = 0;
        if (dragDirection.value === 'Horizontal') {
          offset = dragMovement.value[0];
        } else {
          offset = dragMovement.value[1];
        }
        if (dragDirection.value === 'Horizontal') {
          const currTime = player.value?.currentTime();
          if (currTime && offset != 0) {
            player.value?.currentTime(
              Math.min(player?.value.duration(), Math.max(0, currTime + offset))
            );
          }
        }
        isDragging.value = false;
        dragDirection.value = undefined;
        dragMovement.value = [0, 0];
      },
    },
    {
      domTarget: videoWrapper,
      eventOptions: { passive: false },
    }
  );
};
if (displayStore.isAndroid) {
  mountGuesture();
}

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

const onFullScreenChange = () => {
  if (player.value?.isFullscreen()) {
    displayStore.fullScreenMode = true;
  } else {
    displayStore.fullScreenMode = false;
  }
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
  const err = player.value?.error()?.message;
  if (err) {
    showNotify(err);
  }
};

onMounted(() => {
  nextTick(() => {
    if (displayStore.isAndroid) {
      const element = document.querySelector('.video-container') as HTMLElement;
      if (element) {
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

        manager.on('tap', (e) => {
          if (
            e.target.classList.contains('vjs-tech') ||
            e.target.classList.contains('bg-mask')
          ) {
            toggleShowControls();
          }
          if (displayStore.fullScreenMode && displayStore.isAndroid) {
            hide_status_bar();
          }
        });
        manager.on('dbtap', (e) => {
          if (
            e.target.classList.contains('vjs-tech') ||
            e.target.classList.contains('bg-mask')
          ) {
            togglePlay();
          }
        });
      }
    }
  });
});
watch(
  () => displayStore.fullScreenMode,
  (newVal, oldVal) => {
    mountGuesture();
  }
);
</script>

<style lang="less" scoped></style>
