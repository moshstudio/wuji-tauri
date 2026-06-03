<script setup lang="ts">
import type {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoSource,
  VideoUrlMap,
} from '@wuji-tauri/source-extension';
import type Player from 'xgplayer';
import { Icon } from '@iconify/vue';
import { useResizeObserver, useWindowSize } from '@vueuse/core';
import { castArray } from 'lodash';
import { computed, ref, useSlots, watch } from 'vue';
import MembershipFeatureWrap from '@/components/badge/MembershipFeatureWrap.vue';
import ResponsiveGrid2 from '@/components/grid/ResponsiveGrid2.vue';
import { useDisplayStore } from '@/store';
import { MembershipFeature } from '@/utils/membershipBadge';

const props = withDefaults(
  defineProps<{
    player?: Player;
    videoItem?: VideoItem;
    videoSource?: VideoSource;
    playingResource?: VideoResource;
    playingEpisode?: VideoEpisode;
    videoSrc?: VideoUrlMap;
    inShelf?: boolean;
    preview?: boolean;
    play?: (resource: VideoResource, episode: VideoEpisode) => Promise<void>;
    addToShelf?: (video: VideoItem) => void;
    onDownload?: (resource: VideoResource, episode: VideoEpisode) => void;
    onCast?: () => void;
    showSearch?: () => void;
    onPreviewEpisode?: (
      resource: VideoResource,
      episode: VideoEpisode,
    ) => void;
    onPreviewResource?: (resource: VideoResource) => void;
  }>(),
  {
    inShelf: false,
    preview: false,
  },
);
const showPlaylist = defineModel<boolean>('showPlaylist', {
  default: false,
});
const slots = useSlots();
const hasPlayerSlot = computed(() => !!slots.default);
const displayStore = useDisplayStore();
const _selectedResource = ref<VideoResource>();
const selectedResource = computed({
  get() {
    if (_selectedResource.value) {
      return _selectedResource.value;
    }
    else {
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
const activeTab = ref<number | string>(0);

watch(
  () => props.playingResource?.id,
  () => {
    const resources = props.videoItem?.resources;
    if (!resources?.length) {
      activeTab.value = 0;
      return;
    }
    const idx = resources.findIndex(r => r.id === props.playingResource?.id);
    activeTab.value = idx >= 0 ? idx : 0;
  },
  { immediate: true },
);

function onTabChange(name: string | number) {
  const index = typeof name === 'number' ? name : Number(name);
  const resource = props.videoItem?.resources?.[index];
  if (!resource) {
    return;
  }
  selectedResource.value = resource;
  if (props.preview) {
    props.onPreviewResource?.(resource);
  }
}

const tabOffsetTop = computed(() => {
  if (displayStore.fullScreenMode) {
    return '50px';
  }
  else {
    return windowHeight.value - videoListElementHeight.value - 50 + 38;
  }
});
useResizeObserver(videoListElement, (entries) => {
  const entry = entries[0];
  videoListElementHeight.value = entry.contentRect.height;
});
</script>

<template>
  <div
    class="xgplayer-container grid h-full w-full overflow-hidden transition-all duration-300"
    :class="[
      preview ? 'bg-[var(--van-background-2)]' : 'bg-black',
      preview
        ? hasPlayerSlot
          ? 'grid-rows-[auto_1fr] min-h-0'
          : 'grid-rows-[1fr]'
        : displayStore.fullScreenMode
          ? showPlaylist
            ? 'grid-cols-[0.65fr_0.35fr]'
            : 'grid-cols-[1fr_0fr]'
          : showPlaylist
            ? 'grid-rows-[0.35fr_0.65fr]'
            : 'grid-rows-[1fr_0fr]',
    ]"
  >
    <slot />

    <div
      v-if="preview || showPlaylist"
      ref="videoListElement"
      class="video-list flex h-full w-full cursor-auto flex-col overflow-hidden bg-[var(--van-background-2)] text-[var(--van-text-color)]"
      :class="
        preview
          ? ''
          : displayStore.fullScreenMode
            ? 'rounded-l-lg'
            : 'rounded-t-lg'
      "
    >
      <div
        v-if="!preview"
        class="flex h-[38px] flex-shrink-0 items-center justify-end gap-2"
      >
        <van-icon
          :name="inShelf ? 'like' : 'like-o'"
          :color="inShelf ? 'red' : ''"
          size="22"
          class="van-haptics-feedback p-2"
          @click="
            () => {
              if (videoItem) {
                addToShelf?.(videoItem);
              }
            }
          "
        />
        <MembershipFeatureWrap
          v-if="displayStore.isAndroid"
          :feature="MembershipFeature.VideoCast"
          class="van-haptics-feedback cursor-pointer p-2"
          @click="onCast?.()"
        >
          <Icon icon="mdi:cast" width="22" height="22" />
        </MembershipFeatureWrap>
        <van-icon
          name="down"
          size="22"
          class="van-haptics-feedback p-2"
          @click="
            () => {
              if (playingResource && playingEpisode) {
                onDownload?.(playingResource, playingEpisode);
              }
            }
          "
        />
        <van-icon
          name="search"
          size="22"
          class="van-haptics-feedback p-2"
          @click="() => showSearch?.()"
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
                v-for="tag in castArray(videoItem?.tags)"
                :key="tag"
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
          v-model:active="activeTab"
          swipe-threshold="3"
          sticky
          :offset-top="preview ? 0 : tabOffsetTop"
          @change="onTabChange"
        >
          <van-tab
            v-for="(resource, index) in videoItem?.resources"
            :key="resource.id + index"
            :name="index"
          >
            <template #title>
              <div
                class="p-2"
                :class="
                  index === activeTab || resource.id === selectedResource?.id
                    ? 'text-blue-500'
                    : ''
                "
              >
                {{ resource.title }}
              </div>
            </template>
            <ResponsiveGrid2
              min-width="40"
              class="episode-show-list flex w-full flex-col overflow-y-auto overflow-x-hidden"
            >
              <van-button
                v-for="(episode, episodeIndex) in resource?.episodes"
                :key="`${resource.id}${episode.id}${episodeIndex}`"
                class="flex-shrink-0"
                size="small"
                :type="
                  resource.id === playingResource?.id
                    && episode.id === playingEpisode?.id
                    ? 'success'
                    : 'default'
                "
                :class="
                  resource.id === playingResource?.id
                    && episode.id === playingEpisode?.id
                    ? 'video-playing-episode'
                    : ''
                "
                @click="
                  () => {
                    if (preview) {
                      onPreviewEpisode?.(resource, episode);
                      return;
                    }
                    play?.(resource, episode);
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
