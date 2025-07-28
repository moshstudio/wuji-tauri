<script setup lang="ts">
import _ from 'lodash';
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import type videojs from 'video.js';

import MVideoPlayer from '@/components2/media/MVideoPlayer.vue';
import VideoComponent from './detail/VideoComponent.vue';
import VideoFullscreenComponent from './detail/VideoFullscreenComponent.vue';
import VideoControls from './detail/VideoControls.vue';
import VideoFullscrenControls from './detail/VideoFullscrenControls.vue';
import { useDisplayStore } from '@/store';
import { computed, ref } from 'vue';
import { Swiper, SwiperSlide } from 'swiper/vue';
import { Swiper as SwiperType } from 'swiper/types';
import 'swiper/css';
import { VideoPlayerState } from '@videojs-player/vue';

type VideoJsPlayer = ReturnType<typeof videojs>;

const player = defineModel<VideoJsPlayer>('player');
const playerState = defineModel<VideoPlayerState>('playerState');

const props = defineProps<{
  videoSources: import('video.js').default.Tech.SourceObject[];
  videoSource?: VideoSource;
  videoItem?: VideoItem;
  playingResource?: VideoResource;
  playingEpisode?: VideoEpisode;
  videoSrc?: VideoUrlMap;
  inShelf?: boolean;
  playOrPause: () => void;
  play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
  addToShelf: (video: VideoItem) => void;
  playPrev: (resource?: VideoResource, episode?: VideoEpisode) => void;
  playNext: (resource?: VideoResource, episode?: VideoEpisode) => void;
  toggleFullScreen: (fullscreen: boolean) => void;
  onCanPlay: (args: any) => void;
  onPlayFinished: (args: any) => void;
}>();

const displayStore = useDisplayStore();

const controlRef =
  ref<InstanceType<typeof VideoControls | typeof VideoFullscrenControls>>();
const componentRef =
  ref<InstanceType<typeof VideoComponent | typeof VideoFullscreenComponent>>();

const prevEpisode = computed(() => {
  if (props.playingResource?.episodes?.length) {
    const index = props.playingResource.episodes.findIndex(
      (item) => item.id === props.playingEpisode?.id,
    );
    if (index > 0) {
      return props.playingResource.episodes[index - 1];
    }
  }
  return undefined;
});

const nextEpisode = computed(() => {
  if (props.playingResource?.episodes?.length) {
    const index = props.playingResource.episodes.findIndex(
      (item) => item.id === props.playingEpisode?.id,
    );
    if (index < props.playingResource.episodes.length - 1) {
      return props.playingResource.episodes[index + 1];
    }
  }
  return undefined;
});

const swipeable = computed(() => {
  return !componentRef.value?.isShowing && !controlRef.value?.isShowing;
});

const videoDirection = ref<'vertical' | 'horizontal'>('vertical');
const videoPosition = ref(0);
const videoDuration = ref(0);

function handlePageChange(swiper: SwiperType) {
  if (swiper.activeIndex == 0) {
    if (!prevEpisode.value) {
      swiper.slideTo(1, 200, false);
    }
  } else if (swiper.activeIndex == 2) {
    if (!nextEpisode.value) {
      swiper.slideTo(1, 200, false);
    }
  }
}
function handlePageChanged(swiper: SwiperType) {
  if (swiper.activeIndex == 0) {
    if (prevEpisode.value) {
      // 播放上一个视频
      props.playPrev(props.playingResource, props.playingEpisode);
      swiper.slideTo(1, 0, false);
    }
  } else if (swiper.activeIndex == 2) {
    if (nextEpisode.value) {
      // 播放下一个视频
      props.playNext(props.playingResource, props.playingEpisode);
      swiper.slideTo(1, 0, false);
    }
  }
}

function formatTime(seconds: number) {
  if (seconds === Infinity) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
</script>

<template>
  <div
    id="video-box"
    class="flex h-full w-full overflow-hidden bg-black"
    :class="displayStore.fullScreenMode ? '' : 'flex-col'"
  >
    <Swiper
      class="h-full w-full flex-grow"
      direction="vertical"
      :allow-slide-next="swipeable"
      :allow-slide-prev="swipeable"
      :grabCursor="true"
      :centeredSlides="true"
      :slidesPerView="'auto'"
      :initialSlide="1"
      @slide-change="handlePageChange"
      @slide-change-transition-end="handlePageChanged"
    >
      <SwiperSlide>
        <div class="flex h-full w-full flex-col items-center justify-end">
          <div class="mb-[40px] flex flex-col items-center">
            <p>{{ prevEpisode ? '播放上个视频' : '没有上个视频了' }}</p>
            <p>{{ prevEpisode?.title || '' }}</p>
          </div>
        </div>
      </SwiperSlide>
      <SwiperSlide>
        <div
          class="relative flex h-full w-full items-center justify-center"
          @click="controlRef?.click"
        >
          <MVideoPlayer
            v-model:player="player"
            v-model:state="playerState"
            v-model:direction="videoDirection"
            v-model:position="videoPosition"
            v-model:duration="videoDuration"
            :video-src="videoSrc"
            :video-sources="videoSources"
            :resource="playingResource"
            :episode="playingEpisode"
            :on-can-play="(args) => onCanPlay(args)"
            :on-play-finished="(args) => onPlayFinished(args)"
            class="pointer-events-none h-full w-full"
          />
          <VideoControls
            v-if="!displayStore.fullScreenMode"
            ref="controlRef"
            :player="player"
            :player-state="playerState"
            :video-sources="videoSources"
            :video-source="videoSource"
            :video-item="videoItem"
            :playing-resource="playingResource"
            :playing-episode="playingEpisode"
            :video-src="videoSrc"
            :videoDirection="videoDirection"
            :videoDuration="videoDuration"
            :videoPosition="videoPosition"
            :in-shelf="inShelf"
            :component-is-showing="componentRef?.isShowing"
            :show-component="componentRef?.showComponent"
            :play="play"
            :play-prev="playPrev"
            :play-next="playNext"
            :play-or-pause="playOrPause"
            :toggle-full-screen="toggleFullScreen"
            :add-to-shelf="addToShelf"
            :on-can-play="onCanPlay"
            :on-play-finished="onPlayFinished"
            :format-time="formatTime"
          ></VideoControls>
          <VideoFullscrenControls
            v-else
            ref="controlRef"
            :player="player"
            :player-state="playerState"
            :video-sources="videoSources"
            :video-source="videoSource"
            :video-item="videoItem"
            :playing-resource="playingResource"
            :playing-episode="playingEpisode"
            :video-src="videoSrc"
            :videoDirection="videoDirection"
            :videoDuration="videoDuration"
            :videoPosition="videoPosition"
            :in-shelf="inShelf"
            :component-is-showing="componentRef?.isShowing"
            :show-component="componentRef?.showComponent"
            :play="play"
            :play-prev="playPrev"
            :play-next="playNext"
            :play-or-pause="playOrPause"
            :toggle-full-screen="toggleFullScreen"
            :add-to-shelf="addToShelf"
            :on-can-play="onCanPlay"
            :on-play-finished="onPlayFinished"
            :format-time="formatTime"
          ></VideoFullscrenControls>
        </div>
      </SwiperSlide>
      <SwiperSlide>
        <div class="flex h-full w-full flex-col items-center justify-start">
          <div class="mt-[40px] flex flex-col items-center">
            <p>{{ nextEpisode ? '下个视频' : '没有下个视频了' }}</p>
            <p>{{ nextEpisode?.title || '' }}</p>
          </div>
        </div>
      </SwiperSlide>
    </Swiper>
    <VideoComponent
      v-if="!displayStore.fullScreenMode"
      ref="componentRef"
      :player="player"
      :player-state="playerState"
      :video-sources="videoSources"
      :video-source="videoSource"
      :video-item="videoItem"
      :playing-resource="playingResource"
      :playing-episode="playingEpisode"
      :video-src="videoSrc"
      :videoDirection="videoDirection"
      :videoDuration="videoDuration"
      :videoPosition="videoPosition"
      :in-shelf="inShelf"
      :play="play"
      :play-prev="playPrev"
      :play-next="playNext"
      :play-or-pause="playOrPause"
      :toggle-full-screen="toggleFullScreen"
      :add-to-shelf="addToShelf"
      :on-can-play="onCanPlay"
      :on-play-finished="onPlayFinished"
      :format-time="formatTime"
    ></VideoComponent>
    <VideoFullscreenComponent
      v-else
      ref="componentRef"
      :player="player"
      :player-state="playerState"
      :video-sources="videoSources"
      :video-source="videoSource"
      :video-item="videoItem"
      :playing-resource="playingResource"
      :playing-episode="playingEpisode"
      :video-src="videoSrc"
      :videoDirection="videoDirection"
      :videoDuration="videoDuration"
      :videoPosition="videoPosition"
      :in-shelf="inShelf"
      :play="play"
      :play-prev="playPrev"
      :play-next="playNext"
      :play-or-pause="playOrPause"
      :toggle-full-screen="toggleFullScreen"
      :add-to-shelf="addToShelf"
      :on-can-play="onCanPlay"
      :on-play-finished="onPlayFinished"
      :format-time="formatTime"
    ></VideoFullscreenComponent>
  </div>
</template>

<style scoped lang="less"></style>
