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
function click() {
  if (props.componentIsShowing) {
    props.showComponent?.(false);
  } else {
    props.playOrPause();
  }
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
    }, 500);
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
  slideMode: 'line' as 'line' | 'mini' | 'detail',
  sliderTimer: undefined as NodeJS.Timeout | undefined,
  slideElement: undefined as HTMLElement | undefined,
});

function dragHandler(dragState: AnyGestureEventTypes['drag'], event: any) {
  if (dragState.first && dragState.axis != 'y') {
    clearTimeout(slideOptions.sliderTimer);
    updateReactive(slideOptions, {
      isSliding: true,
      startPosition: props.videoPosition,
      slideMode: 'detail',
      sliderTimer: undefined,
    });
  }
  if (dragState.last) {
    // 跳转进度
    props.player?.currentTime(slideOptions.targetPosition);
    props.player?.play();
    updateReactive(slideOptions, {
      isSliding: false,
      slideMode: 'mini',
      sliderTimer: setTimeout(() => {
        slideOptions.slideMode = 'line';
      }, 2000),
    });
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
    class="left-speed border-box absolute bottom-0 left-0 right-[calc(100%-40px)] top-0 rounded-r-[50%]"
    @click.stop
  />
  <div
    v-drag="longPressHandler"
    class="right-speed border-box absolute bottom-0 left-[calc(100%-40px)] right-0 top-0 rounded-l-[50%]"
    @click.stop
  />
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="scale-[1.5] opacity-0"
    enter-to-class="scale-[1] opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="scale-[1] opacity-100"
    leave-to-class="scale-[1.5] opacity-0"
  >
    <!-- 播放按钮 -->
    <Icon
      v-if="playerState?.paused && videoDuration"
      icon="solar:play-bold"
      width="60"
      height="60"
      color="rgba(220, 220, 220, 0.5)"
      class="van-haptics-feedback absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform"
      @click.stop="playOrPause"
    />
  </transition>
  <transition
    enter-active-class="transition-all duration-300  delay-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
  >
    <div
      v-if="videoDirection == 'horizontal' && !componentIsShowing"
      class="absolute left-1/2 top-[70%] -translate-x-1/2 -translate-y-1/2"
    >
      <div
        class="van-haptics-feedback transform rounded-[14px] border-[1px] border-gray-300/40 bg-gray-300/10 px-3 py-1 text-xs text-gray-300"
        @click.stop="() => toggleFullScreen(true)"
      >
        全屏播放
      </div>
    </div>
  </transition>
  <!-- slider -->
  <transition
    enter-active-class="transition-all duration-300  delay-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
  >
    <div
      v-if="!componentIsShowing && !videoSrc?.isLive"
      class="slider z-2 pointer-events-none absolute bottom-0 left-0 right-0 transition-all"
    >
      <div class="p-1">
        <div
          v-if="slideOptions.slideMode === 'line'"
          class="relative h-[2px] w-full rounded-lg bg-gray-600/80"
        >
          <div
            class="absolute left-0 h-[2px] rounded-lg bg-gray-100"
            :style="{ width: `${(videoPosition / videoDuration) * 100}%` }"
          />
        </div>
        <div
          v-if="slideOptions.slideMode === 'mini'"
          class="relative h-[4px] w-full rounded-lg bg-gray-600/80"
        >
          <div
            class="absolute left-0 h-[4px] rounded-lg bg-gray-100"
            :style="{ width: `${(videoPosition / videoDuration) * 100}%` }"
          />
        </div>
        <div
          v-if="slideOptions.slideMode === 'detail'"
          class="flex flex-col items-center justify-end gap-3"
        >
          <div class="flex items-center gap-2 text-lg">
            <span class="text-white">
              {{
                slideOptions.isSliding
                  ? formatTime(slideOptions.targetPosition)
                  : formatTime(videoPosition)
              }}
            </span>
            /
            <span class="text-gray-200">
              {{ formatTime(videoDuration) }}
            </span>
          </div>
          <div class="relative h-[12px] w-full rounded-lg bg-gray-600/80">
            <div
              class="absolute left-0 h-[12px] rounded-lg bg-gray-100"
              :style="{
                width: slideOptions.isSliding
                  ? `${(slideOptions.targetPosition / videoDuration) * 100}%`
                  : `${(videoPosition / videoDuration) * 100}%`,
              }"
            />
          </div>
        </div>
      </div>

      <div
        v-if="longPressOptions.isPressing"
        class="border-box pointer-events-none flex items-center justify-center bg-black p-1"
      >
        2倍速播放中
      </div>
    </div>
  </transition>

  <div
    v-if="!componentIsShowing && videoDuration && !videoSrc?.isLive"
    :ref="(el) => (slideOptions.slideElement = el as HTMLElement)"
    v-drag="dragHandler"
    class="pointer-events-auto absolute bottom-0 left-0 right-0 h-[24px] w-full"
    @click.stop
  />
  <!-- sidebar -->
  <transition
    enter-active-class="transition-all duration-300 delay-300"
    enter-from-class="opacity-0 translate-x-[200px]"
    enter-to-class="opacity-100"
  >
    <div
      v-if="!componentIsShowing"
      class="sidebar z-2 absolute bottom-10 right-3 flex flex-col items-center gap-4"
    >
      <van-icon
        :name="inShelf ? 'like' : 'like-o'"
        :color="inShelf ? 'red' : 'white'"
        size="26"
        class="van-haptics-feedback"
        @click.stop="
          () => {
            if (inShelf) {
              router.push({ name: 'VideoShelf' });
            } else {
              if (videoItem) {
                addToShelf(videoItem);
              }
            }
          }
        "
      />
      <van-icon
        name="bars"
        color="white"
        size="26"
        class="van-haptics-feedback"
        @click.stop="() => showComponent?.(true)"
      />
    </div>
  </transition>

  <!-- top-button -->
  <transition
    enter-active-class="transition-all duration-300  delay-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
  >
    <div
      class="top-button z-2 absolute left-0 top-0 flex w-full items-center gap-2 overflow-hidden px-2 text-sm"
    >
      <van-icon
        name="arrow-left"
        size="24"
        color="white"
        class="van-haptics-feedback flex-shrink-0 p-2"
        @click.stop="() => backStore.back(true)"
      />
      <span v-if="playerState?.paused" class="flex-1 truncate text-gray-400">
        {{ playingEpisode?.title }}
      </span>
      <span
        v-if="playerState?.paused && videoDuration"
        class="flex-shrink-0 truncate text-gray-400"
      >
        {{ formatTime(videoPosition) }}/{{ formatTime(videoDuration) }}
      </span>
    </div>
  </transition>
</template>

<style scoped lang="less"></style>
