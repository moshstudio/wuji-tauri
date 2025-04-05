<script setup lang="ts">
import { useDisplayStore, useStore } from '@/store';
import { storeToRefs } from 'pinia';
import VideosTab from '@/components/windows/VideosTab.vue';
import VideoShelf from '@/views/video/VideoShelf.vue';
import WinSearch from '@/components/windows/WinSearch.vue';
import { VideoSource } from '@/types';
import { VideoItem } from '@/extensions/video';

const searchValue = defineModel('searchValue', { type: String, default: '' });

const emit = defineEmits<{
  (e: 'recommend', force?: boolean): void;
  (e: 'search'): void;
  (e: 'loadType', source: VideoSource, type?: string): void;
  (e: 'loadPage', source: VideoSource, pageNo?: number, type?: string): void;
  (e: 'toDetail', source: VideoSource, item: VideoItem): void;
  (e: 'openBaseUrl', source: VideoSource): void;
}>();

const store = useStore();
const displayStore = useDisplayStore();
const { videoSources } = storeToRefs(store);
</script>

<template>
  <div
    v-remember-scroll
    class="w-full h-full overflow-x-hidden overflow-y-auto"
  >
    <div class="flex items-center justify-between px-4 py-2">
      <div class="placeholder"></div>
      <WinSearch
        v-model:search-value="searchValue"
        @search="() => emit('search')"
      ></WinSearch>
      <div
        class="text-button text-nowrap"
        @click="displayStore.showVideoShelf = true"
      >
        收藏
      </div>
    </div>
    <div v-for="source in videoSources" :key="source.item.id" class="px-4">
      <div v-show="!!source.list">
        <van-row justify="space-between">
          <van-button
            :plain="true"
            size="small"
            @click="() => emit('openBaseUrl', source)"
          >
            {{ source.item.name }}
          </van-button>
        </van-row>
        <VideosTab
          :source="source"
          @on-load="(source, type) => emit('loadType', source, type)"
          @load-page="
            (source, pageNo, type) => emit('loadPage', source, pageNo, type)
          "
          @on-detail="(source, item) => emit('toDetail', source, item)"
        >
        </VideosTab>
        <van-divider :style="{ margin: '8px 0px' }" />
      </div>
    </div>
    <VideoShelf></VideoShelf>
  </div>
</template>

<style scoped lang="less"></style>
