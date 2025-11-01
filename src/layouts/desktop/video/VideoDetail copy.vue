<script setup lang="ts">
import _ from 'lodash';
import {
  VideoSource,
  VideoItem,
  VideoResource,
  VideoEpisode,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import { ref, reactive, computed, watch } from 'vue';
import Player from 'xgplayer';
import { useDisplayStore } from '@/store';

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
</script>

<template>
  <div
    class="xgplayer-container grid h-full w-full overflow-hidden bg-black transition-all duration-300"
    :class="showPlaylist ? 'grid-cols-[0.65fr_0.35fr]' : 'grid-cols-[1fr_0fr]'"
  >
    <slot></slot>

    <div
      class="video-list !z-[10000] flex h-full w-full cursor-auto flex-col overflow-hidden rounded-l-lg bg-[var(--van-background-2)] text-[var(--van-text-color)]"
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
        class="flex w-full flex-1 flex-col justify-start gap-1 overflow-hidden px-3"
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
        <div
          class="flex flex-shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-2"
        >
          <van-button
            v-for="resource in videoItem?.resources"
            :key="`resource${resource.id}`"
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
            :key="`episode${episode.id}`"
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
  </div>
</template>

<style scoped lang="less"></style>
