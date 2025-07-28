<script setup lang="ts">
import _ from 'lodash';
import { VideoPlayerState } from '@videojs-player/vue';
import {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import ResponsiveGrid2 from '@/components2/grid/ResponsiveGrid2.vue';
import type videojs from 'video.js';
import { computed, nextTick, ref, watch } from 'vue';

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
    controlsIsShowing?: boolean;
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
    controlsIsShowing: false,
  },
);

const isShowing = ref(false);
async function showComponent(show: boolean) {
  isShowing.value = show;
  await nextTick();
  const resource = document.querySelector(
    '.video-playing-resource',
  ) as HTMLElement;
  if (resource) {
    (resource.parentNode as HTMLDivElement).scrollLeft =
      resource.offsetLeft - 40;
  }
  const episode = document.querySelector(
    '.video-playing-episode',
  ) as HTMLElement;
  const list = document.querySelector('.episode-show-list') as HTMLElement;
  if (episode && list) {
    list.scrollTop = episode.offsetTop - list.offsetTop - 100;
  }
}
defineExpose({
  isShowing,
  showComponent,
});

const _selectedResource = ref<VideoResource>();
const selectedResource = computed({
  get() {
    if (_selectedResource.value) {
      return _selectedResource.value;
    } else {
      return props.playingResource;
    }
  },
  set(resource: VideoResource | undefined) {
    _selectedResource.value = resource;
  },
});
watch(
  () => props.videoItem,
  () => {
    selectedResource.value = undefined;
  },
);
</script>

<template>
  <transition
    enter-active-class="transition-transform duration-300 ease-in-out"
    enter-from-class="translate-x-full"
    enter-to-class="translate-x-0"
    leave-active-class="transition-transform duration-300 ease-in-out"
    leave-from-class="translate-x-0"
    leave-to-class="translate-x-full"
  >
    <div
      v-if="isShowing"
      class="z-2 up-shadow video-list flex h-full w-[30%] flex-shrink-0 cursor-auto flex-col overflow-hidden rounded-t-lg bg-[var(--van-background-2)] text-[var(--van-text-color)]"
    >
      <div class="flex flex-shrink-0 items-center justify-end">
        <van-icon
          name="cross"
          class="van-haptics-feedback p-2"
          @click="() => (isShowing = false)"
        />
      </div>
      <div
        class="flex w-full flex-1 flex-col justify-start gap-1 overflow-hidden px-3"
      >
        <div
          class="flex w-full flex-shrink-0 items-center justify-start gap-2 overflow-hidden"
        >
          <!-- <div v-if="videoItem?.cover" class="h-[100px] w-[80px]">
            <LoadImage
              :width="80"
              :height="100"
              radius="4"
              :src="videoItem?.cover"
              :headers="videoItem?.coverHeaders"
            />
          </div> -->
          <div class="flex min-w-[100px] flex-col gap-1">
            <h2 class="font-bold">{{ videoItem?.title }}</h2>
            <div class="flex gap-1 overflow-x-auto">
              <van-tag
                v-for="tag in _.castArray(videoItem?.tags)"
                plain
                color="rgba(240,240,240,0.3)"
                text-color="var(--van-text-color-2)"
                class="flex-shrink-0"
              >
                {{ tag }}
              </van-tag>
            </div>
            <div class="flex">
              <van-tag
                v-if="videoItem?.releaseDate"
                color="rgba(240,240,240,0.3)"
                text-color="var(--van-text-color-2)"
              >
                {{ videoItem?.releaseDate }}
              </van-tag>
              <van-tag
                v-if="videoItem?.country"
                color="rgba(240,240,240,0.3)"
                text-color="var(--van-text-color-2)"
              >
                {{ videoItem?.country }}
              </van-tag>
              <van-tag
                v-if="videoItem?.duration"
                color="rgba(240,240,240,0.3)"
                text-color="var(--van-text-color-2)"
              >
                {{ videoItem?.duration }}
              </van-tag>
            </div>
            <div
              v-if="videoItem?.director"
              class="min-w-0 truncate text-xs text-[var(--van-text-color-2)]"
            >
              导演: {{ videoItem?.director }}
            </div>
          </div>
        </div>
        <div
          v-if="videoItem?.intro"
          class="line-clamp-3 flex-shrink-0 text-xs text-[var(--van-text-color-2)]"
        >
          介绍: {{ videoItem?.intro }}
        </div>
        <div
          class="flex flex-shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-2"
        >
          <van-button
            v-for="resource in videoItem?.resources"
            :key="`resource` + resource.id"
            class="flex-shrink-0"
            size="small"
            :plain="
              resource.id != selectedResource?.id &&
              resource.id === playingResource?.id
            "
            :type="
              resource.id === selectedResource?.id ||
              resource.id === playingResource?.id
                ? 'primary'
                : 'default'
            "
            :class="
              resource.id === selectedResource?.id
                ? 'video-playing-resource'
                : ''
            "
            @click="
              (e) => {
                selectedResource = resource;
                e.target.scrollIntoView({
                  behavior: 'smooth', // 可选：平滑滚动
                  block: 'nearest', // 垂直方向不强制滚动
                  inline: 'center', // 水平方向居中
                });
              }
            "
          >
            {{ resource.title }}
          </van-button>
        </div>

        <ResponsiveGrid2
          min-width="40"
          class="episode-show-list flex w-full flex-col overflow-y-auto overflow-x-hidden"
        >
          <van-button
            v-for="episode in selectedResource?.episodes"
            :key="`episode` + episode.id"
            class="flex-shrink-0"
            size="small"
            :type="episode.id === playingEpisode?.id ? 'success' : 'default'"
            :class="
              episode.id === playingEpisode?.id ? 'video-playing-episode' : ''
            "
            @click="
              () => {
                if (selectedResource) {
                  play(selectedResource, episode);
                }
              }
            "
          >
            {{ episode.title }}
          </van-button>
        </ResponsiveGrid2>
      </div>
    </div>
  </transition>
</template>

<style scoped lang="less"></style>
