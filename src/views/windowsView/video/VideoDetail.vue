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
import { useVideoShelfStore } from '@/store';
import VideoPlayer from '@/components/media/win/VideoPlayer.vue';
import videojs from 'video.js';
type VideoJsPlayer = ReturnType<typeof videojs>;

const player = defineModel('player', {
  type: Object as PropType<VideoJsPlayer>,
});
const showAddDialog = defineModel('showAddDialog', {
  type: Boolean,
  default: false,
});

const { videoSource, videoItem, playingResource, playingEpisode, videoSrc } =
  defineProps({
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
  (e: 'timeUpdate', args: any): void;
}>();

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
    class="relative flex flex-col gap-2 items-center w-full h-full overflow-y-auto bg-[--van-background-2]"
  >
    <van-nav-bar
      right-text="收藏"
      left-arrow
      @click-left="() => emit('back')"
      @click-right="() => emit('collect')"
      class="w-full"
    />
    <div class="w-full grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div class="w-full aspect-[16/9]">
        <VideoPlayer
          v-model:player="player"
          :src="videoSrc?.url"
          @time-update="(args) => emit('timeUpdate', args)"
          @can-play="(args) => emit('canPlay', args)"
          class="w-full"
        >
        </VideoPlayer>
      </div>
      <div class="flex flex-col gap-2 px-2 text-[var(--van-text-color)]">
        <h2 class="text-lg font-bold">{{ videoItem?.title }}</h2>
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
    </div>
    <div class="flex-grow flex w-full">
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
