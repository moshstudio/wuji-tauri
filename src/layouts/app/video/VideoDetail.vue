<script setup lang="ts">
import _ from 'lodash';
import {
  VideoSource,
  VideoItem,
  VideoResource,
  VideoEpisode,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import { ref, computed, watch, onMounted } from 'vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import Player from 'xgplayer';
import { useDisplayStore } from '@/store';
import { useRect } from '@vant/use';
import { useResizeObserver, useWindowSize } from '@vueuse/core';

const showPlaylist = defineModel<boolean>('showPlaylist', {
  default: false,
});
const props = defineProps<{
  player?: Player;
  videoItem?: VideoItem;
  videoSource?: VideoSource;
  playingResource?: VideoResource;
  playingEpisode?: VideoEpisode;
  videoSrc?: VideoUrlMap;
  inShelf?: boolean;
  play: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
  addToShelf: (video: VideoItem) => void;
  showSearch: () => void;
}>();

const displayStore = useDisplayStore();
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

const { height: windowHeight } = useWindowSize();
const videoListElement = ref<HTMLElement>();
const videoListElementHeight = ref(0);
const activeTabName = ref('');
const tabOffsetTop = computed(() => {
  if (displayStore.fullScreenMode) {
    return '24px';
  } else {
    return windowHeight.value - videoListElementHeight.value - 24;
  }
});
useResizeObserver(videoListElement, (entries) => {
  const entry = entries[0];
  videoListElementHeight.value = entry.contentRect.height;
});
</script>

<template>
  <div
    class="xgplayer-container grid h-full w-full overflow-hidden bg-black transition-all duration-300"
    :class="
      displayStore.fullScreenMode
        ? showPlaylist
          ? 'grid-cols-[0.65fr_0.35fr]'
          : 'grid-cols-[1fr_0fr]'
        : showPlaylist
          ? 'grid-rows-[0.35fr_0.65fr]'
          : 'grid-rows-[1fr_0fr]'
    "
  >
    <slot></slot>

    <div
      ref="videoListElement"
      class="video-list flex h-full w-full cursor-auto flex-col overflow-hidden rounded-l-lg bg-[var(--van-background-2)] text-[var(--van-text-color)]"
    >
      <div class="flex flex-shrink-0 items-center justify-end gap-2">
        <van-icon
          name="search"
          size="22"
          class="van-haptics-feedback p-2"
          @click="showSearch"
        />
        <van-icon
          name="cross"
          size="22"
          class="van-haptics-feedback p-2"
          @click="() => (showPlaylist = false)"
        />
      </div>
      <div
        class="flex h-full w-full flex-grow flex-col justify-start gap-1 overflow-y-auto px-3"
      >
        <div
          class="flex w-full flex-shrink-0 items-center justify-start gap-2 overflow-hidden"
        >
          <div class="flex min-w-[100px] flex-col gap-1">
            <h2 class="font-bold">
              {{ videoItem?.title }}
            </h2>
            <div class="flex gap-1 overflow-x-auto">
              <van-tag
                v-for="tag in _.castArray(videoItem?.tags)"
                plain
                color="rgba(100,100,100,0.3)"
                text-color="var(--van-text-color-2)"
                class="flex-shrink-0"
              >
                {{ tag }}
              </van-tag>
            </div>
            <div class="flex gap-1 overflow-x-auto">
              <van-tag
                v-if="videoItem?.releaseDate"
                color="rgba(100,100,100,0.3)"
                text-color="var(--van-text-color-2)"
              >
                {{ videoItem?.releaseDate }}
              </van-tag>
              <van-tag
                v-if="videoItem?.country"
                color="rgba(100,100,100,0.3)"
                text-color="var(--van-text-color-2)"
              >
                {{ videoItem?.country }}
              </van-tag>
              <van-tag
                v-if="videoItem?.duration"
                color="rgba(100,100,100,0.3)"
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
        <van-tabs
          v-model:active="activeTabName"
          swipe-threshold="3"
          sticky
          :offset-top="tabOffsetTop"
        >
          <van-tab
            v-for="(resource, index) in videoItem?.resources"
            :key="resource.id + index"
          >
            <template #title>
              <div
                class="p-2"
                :class="resource.id === playingResource?.id ? 'text-blue' : ''"
              >
                {{ resource.title }}
              </div>
            </template>
            <ResponsiveGrid2
              min-width="40"
              class="episode-show-list flex w-full flex-col overflow-y-auto overflow-x-hidden"
            >
              <van-button
                v-for="(episode, index) in resource?.episodes"
                :key="`${resource.id}${episode.id}${index}`"
                class="flex-shrink-0"
                size="small"
                :type="
                  episode.id === playingEpisode?.id ? 'success' : 'default'
                "
                :class="
                  episode.id === playingEpisode?.id
                    ? 'video-playing-episode'
                    : ''
                "
                @click="
                  () => {
                    play(resource, episode);
                  }
                "
              >
                {{ episode.title }}
              </van-button>
            </ResponsiveGrid2>
          </van-tab>
        </van-tabs>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less"></style>
