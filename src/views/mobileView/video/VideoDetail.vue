<script setup lang="ts">
import {
  VideoEpisode,
  VideoItem,
  VideoResource,
  VideoUrlMap,
} from '@/extensions/video';
import { VideoSource } from '@/types';
import ResponsiveGrid from '@/components/ResponsiveGrid.vue';
import { PropType, ref, watch } from 'vue';
import { useDisplayStore, useVideoShelfStore } from '@/store';
import MobileVideoPlayer from '@/components/media/mobile/MobileVideoPlayer.vue';
import videojs from 'video.js';
type VideoJsPlayer = ReturnType<typeof videojs>;

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const showAddDialog = defineModel('showAddDialog', {
  type: Boolean,
  default: false,
});
const pageBody = defineModel('pageBody', {
  type: Object as PropType<HTMLElement>,
});

const {
  videoSources,
  videoSource,
  videoItem,
  playingResource,
  playingEpisode,
  videoSrc,
} = defineProps({
  videoSources: {
    type: Object as PropType<import('video.js').default.Tech.SourceObject[]>,
  },
  videoSource: {
    type: Object as PropType<VideoSource>,
  },
  videoItem: {
    type: Object as PropType<VideoItem>,
  },
  playingResource: {
    type: Object as PropType<VideoResource>,
  },
  playingEpisode: {
    type: Object as PropType<VideoEpisode>,
  },
  videoSrc: {
    type: Object as PropType<VideoUrlMap>,
  },
});

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'collect'): void;
  (e: 'play', resource: VideoResource, episode: VideoEpisode): void;
  (e: 'addVideoToShelf', shelfId: string): void;
  (e: 'canPlay', args: any): void;
  (e: 'playNext', args: any): void;
  (e: 'onPlayFinished', args: any): void;
  (e: 'timeUpdate', args: any): void;
}>();

const displayStore = useDisplayStore();
const shelfStore = useVideoShelfStore();
const activeResource = ref('');
watch(
  () => playingResource,
  (newValue) => {
    if (newValue) {
      activeResource.value = newValue.id;
    }
  },
  {
    immediate: true,
  }
);
</script>

<template>
  <div
    ref="pageBody"
    class="relative flex flex-col gap-0 items-center w-full h-full bg-[--van-background-2]"
    :class="[
      displayStore.fullScreenMode
        ? 'overflow-hidden'
        : 'overflow-y-auto overflow-x-hidden',
    ]"
  >
    <MobileVideoPlayer
      v-model:player="player"
      :video-src="videoSrc"
      :video-sources="videoSources"
      :resource="playingResource"
      :episode="playingEpisode"
      @time-update="(args) => emit('timeUpdate', args)"
      @can-play="(args) => emit('canPlay', args)"
      @play-next="(args) => emit('playNext', args)"
      @on-play-finished="(args) => emit('onPlayFinished', args)"
      @back="() => emit('back')"
      @collect="() => emit('collect')"
    >
    </MobileVideoPlayer>
    <div
      class="w-full mt-4 flex flex-col gap-2 px-2 text-[var(--van-text-color)]"
    >
      <div class="flex gap-2 items-center justify-between">
        <h2 class="text-lg font-bold">{{ videoItem?.title }}</h2>
        <van-button
          size="small"
          plain
          type="primary"
          @click="() => emit('collect')"
        >
          收藏
        </van-button>
      </div>

      <div class="flex gap-2 text-xs">
        <p v-if="videoItem?.releaseDate">
          <span class="text-gray-500">年份</span>
          {{ videoItem?.releaseDate }}
        </p>
        <p v-if="videoItem?.country">
          <span class="text-gray-500">地区</span>
          {{ videoItem?.country }}
        </p>
        <p class="text-gray-500">{{ videoSource?.item.name }}</p>
      </div>
      <div class="truncate text-xs" v-if="videoItem?.cast">
        <span class="text-gray-500">演员</span>
        {{ videoItem?.cast }}
      </div>
      <div class="truncate text-xs" v-if="videoItem?.director">
        <span class="text-gray-500">导演</span>
        {{ videoItem?.director }}
      </div>
      <van-text-ellipsis
        rows="3"
        :content="videoItem?.intro"
        expand-text="展开"
        collapse-text="收起"
        class="text-xs"
      />
    </div>
    <div class="flex w-full">
      <van-tabs shrink animated class="w-full" v-model:active="activeResource">
        <van-tab
          :name="resource.id"
          v-for="(resource, index) in videoItem?.resources"
          :key="index"
        >
          <template #title>
            <p class="max-w-[100px] truncate">
              {{ resource.title }}
            </p>
          </template>
          <ResponsiveGrid>
            <p
              v-for="episode in resource.episodes"
              :key="episode.id"
              class="text-sm p-2 rounded-lg cursor-pointer select-none truncate van-haptics-feedback active:bg-[var(--van-background)]"
              :class="
                playingResource?.id === resource.id &&
                playingEpisode?.id === episode.id
                  ? 'bg-[--van-background] text-[var(--van-primary-color)]'
                  : 'text-[var(--van-text-color)]'
              "
              @click="() => emit('play', resource, episode)"
            >
              {{ episode.title }}
            </p>
          </ResponsiveGrid>
        </van-tab>
      </van-tabs>
    </div>
  </div>
  <van-dialog
    v-model:show="showAddDialog"
    title="选择收藏夹"
    :show-confirm-button="false"
    teleport="body"
    show-cancel-button
  >
    <van-cell-group>
      <van-cell
        v-for="item in shelfStore.videoShelf"
        :key="item.id"
        :title="item.name"
        center
        clickable
        @click="() => emit('addVideoToShelf', item.id)"
      >
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
