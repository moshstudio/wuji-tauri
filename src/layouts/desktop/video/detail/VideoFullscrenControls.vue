<script setup lang="ts">
import type { VideoPlayerState } from '@videojs-player/vue';
import type { AnyGestureEventTypes } from '@vueuse/gesture';
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type videojs from 'video.js';
import { Icon } from '@iconify/vue';
import * as commands from 'tauri-plugin-commands-api';
import { reactive, ref } from 'vue';
import { router } from '@/router';
import { useBackStore } from '@/store';
import { updateReactive } from '@/utils';

const props = withDefaults(
  defineProps<{
    player?: ReturnType<typeof videojs>;
    playerState?: VideoPlayerState;
    videoSources: import('video.js').default.Tech.SourceObject[];
    videoSource?: VideoSource;
    videoItem?: VideoItem;
    playingResource?: VideoResource;
    playingEpisode?: VideoEpisode;
    videoSrc?: VideoUrlMap;
    videoDirection?: 'vertical' | 'horizontal';
    videoDuration?: number;
    videoPosition?: number;
    inShelf?: boolean;
    componentIsShowing?: boolean;
    showComponent?: (show: boolean) => void;
    play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
    playPrev: (resource?: VideoResource, episode?: VideoEpisode) => void;
    playNext: (resource?: VideoResource, episode?: VideoEpisode) => void;
    seek: (offset: number) => void;
    playOrPause: () => void;
    addToShelf: (video: VideoItem) => void;
    toggleFullScreen: (fullscreen: boolean) => void;
    onCanPlay: (args: any) => void;
    onPlayFinished: (args: any) => void;
    formatTime: (time: number) => string;
  }>(),
  {
    videoDuration: 0,
    videoPosition: 0,
    inShelf: false,
    componentIsShowing: false,
  },
);

const backStore = useBackStore();

const isShowing = ref(false);
let isShowingTimer: NodeJS.Timeout | undefined;
function refreshTimer() {
  clearTimeout(isShowingTimer);
  if (isShowing.value) {
    isShowingTimer = setTimeout(() => {
      isShowing.value = false;
    }, 8000);
  }
}
function click() {
  isShowing.value = !isShowing.value;
  refreshTimer();
}
function dblClick() {
  props.playOrPause();
}

defineExpose({
  isShowing,
  click,
  dblClick,
});

const longPressOptions = reactive({
  isPressing: false,
  timer: undefined as NodeJS.Timeout | undefined,
});

function longPressHandler(dragState: AnyGestureEventTypes['drag']) {
  if (dragState.first) {
    longPressOptions.timer = setTimeout(() => {
      isShowing.value = true;
      longPressOptions.isPressing = true;
      longPressOptions.timer = undefined;
      commands.vibrate(25);
      props.player?.playbackRate(2);
      props.player?.play();
    }, 1000);
  } else if (dragState.last) {
    if (longPressOptions.timer) {
      // 时长过短，认为是单击事件
      clearTimeout(longPressOptions.timer);
      longPressOptions.timer = undefined;
      click();
    }
    if (longPressOptions.isPressing) {
      isShowing.value = false;
      longPressOptions.isPressing = false;
      props.player?.playbackRate(1);
      props.player?.play();
    }
  } else {
    if (dragState.distance > 40) {
      clearTimeout(longPressOptions.timer);
      longPressOptions.timer = undefined;
    }
  }
}

const slideOptions = reactive({
  isSliding: false,
  startPosition: 0,
  targetPosition: 0,
  slideElement: undefined as HTMLElement | undefined,
});

function dragHandler(dragState: AnyGestureEventTypes['drag'], event: any) {
  if (dragState.first && dragState.axis != 'y') {
    updateReactive(slideOptions, {
      isSliding: true,
      startPosition: props.videoPosition,
    });
    clearTimeout(isShowingTimer);
  }
  if (dragState.last) {
    refreshTimer();
    // 跳转进度
    if (dragState.initial[0] === dragState.xy[0]) {
      // 进行了点击
      const width =
        slideOptions.slideElement?.clientWidth ?? document.body.clientWidth;
      const position = Math.floor(
        (dragState.xy[0] / width) * props.videoDuration,
      );
      props.player?.currentTime(position);
      props.player?.play();
      updateReactive(slideOptions, {
        isSliding: false,
      });
    } else {
      props.player?.currentTime(slideOptions.targetPosition);
      props.player?.play();
      updateReactive(slideOptions, {
        isSliding: false,
      });
    }
  }
  if (!slideOptions.isSliding) return;
  const width =
    slideOptions.slideElement?.clientWidth ?? document.body.clientWidth;
  slideOptions.targetPosition = Math.max(
    0,
    Math.min(
      props.videoDuration,
      (dragState.movement[0] / width) * props.videoDuration +
        slideOptions.startPosition,
    ),
  );
}
</script>

<template>
  <div
    v-drag="longPressHandler"
    class="left-speed border-box absolute bottom-0 left-0 right-[calc(100%-60px)] top-0 rounded-r-[50%]"
    @click.stop
  />
  <div
    v-drag="longPressHandler"
    class="right-speed border-box absolute bottom-0 left-[calc(100%-60px)] right-0 top-0 rounded-l-[50%]"
    @click.stop
  />
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <!-- 播放暂停按钮等 -->
    <div
      v-if="isShowing && videoDuration"
      class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-[100px] transition-all"
    >
      <div
        class="van-haptics-feedback"
        @click.stop="
          () => {
            seek(-10);
            refreshTimer();
          }
        "
        @dblclick.stop
      >
        <Icon
          icon="material-symbols:replay-10-rounded"
          width="40"
          height="40"
          color="rgba(220, 220, 220, 0.8)"
        />
      </div>
      <div
        class="van-haptics-feedback"
        @click.stop="
          () => {
            playOrPause();
            refreshTimer();
          }
        "
        @dblclick.stop
      >
        <Icon
          v-if="!!playerState?.paused"
          icon="solar:play-bold"
          width="60"
          height="60"
          color="rgba(220, 220, 220, 0.8)"
        />
        <Icon
          v-else
          icon="solar:pause-bold"
          width="60"
          height="60"
          color="rgba(220, 220, 220, 0.5)"
        />
      </div>
      <div
        class="van-haptics-feedback"
        @click.stop="
          () => {
            seek(10);
            refreshTimer();
          }
        "
        @dblclick.stop
      >
        <Icon
          icon="material-symbols:forward-10-rounded"
          width="40"
          height="40"
          color="rgba(220, 220, 220, 0.8)"
        />
      </div>
    </div>
  </transition>
  <!-- 下方控制栏 -->
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div class="absolute bottom-0 left-0 right-0 flex flex-col transition-all">
      <div v-if="isShowing" class="flex flex-col gap-1 p-1">
        <div
          v-if="
            slideOptions.isSliding &&
            slideOptions.targetPosition != slideOptions.startPosition
          "
          class="pointer-events-none flex w-full items-center justify-center"
        >
          <span class="text-base text-gray-100">
            {{ formatTime(slideOptions.targetPosition) }}
          </span>
          <span class="text-base text-gray-400">/</span>
          <span class="text-base text-gray-400">
            {{ formatTime(videoDuration) }}
          </span>
        </div>
        <div
          :ref="(el) => (slideOptions.slideElement = el as HTMLElement)"
          v-drag="dragHandler"
          class="relative h-[10px] w-full cursor-pointer rounded-lg bg-gray-600/60"
          @click.stop
        >
          <div
            class="absolute left-0 h-[10px] rounded-lg bg-gray-100/60"
            :style="{ width: `${(videoPosition / videoDuration) * 100}%` }"
          />
        </div>
        <div
          class="pointer-events-none flex w-full items-center justify-between gap-4 px-4"
        >
          <div>
            <span class="text-xs text-gray-100">
              {{ formatTime(videoPosition) }}
            </span>
            <span class="text-xs text-gray-400">/</span>
            <span class="text-xs text-gray-400">
              {{ formatTime(videoDuration) }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <div
              v-if="longPressOptions.isPressing"
              class="pointer-events-none px-1 text-sm"
            >
              2倍速播放中
            </div>
            <van-icon
              :name="inShelf ? 'like' : 'like-o'"
              :color="inShelf ? 'red' : 'white'"
              size="26"
              class="van-haptics-feedback pointer-events-auto"
              @click.stop="
                () => {
                  if (inShelf) {
                    router.push({ name: 'VideoShelf' }).then(() => {
                      toggleFullScreen(false);
                    });
                  } else {
                    if (videoItem) {
                      addToShelf(videoItem);
                    }
                    refreshTimer();
                  }
                }
              "
            />
            <van-icon
              name="bars"
              color="white"
              size="26"
              class="van-haptics-feedback pointer-events-auto"
              @click.stop="
                () => {
                  showComponent?.(!componentIsShowing);
                  refreshTimer();
                }
              "
            />
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- top-button -->
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isShowing"
      class="top-button z-2 absolute left-0 top-0 flex w-full items-center gap-2 overflow-hidden px-2 text-sm"
    >
      <van-icon
        name="arrow-left"
        size="24"
        color="white"
        class="van-haptics-feedback flex-shrink-0 p-2"
        @click.stop="backStore.back"
      />
      <span class="flex-1 truncate text-gray-400">
        {{ playingEpisode?.title }}
      </span>
    </div>
  </transition>
</template>

<style scoped lang="less"></style>
