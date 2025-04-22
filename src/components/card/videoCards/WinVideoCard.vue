<script setup lang="ts">
import type { VideoItem } from '@/extensions/video';
import LoadImage from '@/components/LoadImage.vue';
import { useDisplayStore } from '@/store';
import _ from 'lodash';

const { videoItem } = defineProps<{
  videoItem: VideoItem;
}>();
const emit = defineEmits<{
  (e: 'click', item: VideoItem): void;
}>();
const displayStore = useDisplayStore();
</script>

<template>
  <div
    class="relative flex flex-col w-[140px] rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="() => emit('click', videoItem)"
  >
    <LoadImage
      :width="140"
      :height="200"
      fit="cover"
      lazy-load
      :src="videoItem.cover!"
      :headers="videoItem.coverHeaders || undefined"
      class="rounded-t-lg"
    />

    <p
      v-if="videoItem.title"
      class="text-xs text-[var(--van-text-color)] text-center truncate py-1"
    >
      {{ videoItem.title }}
    </p>
    <p
      v-if="videoItem.tags"
      class="absolute text-xs rounded left-0 bottom-6 p-1 truncate bg-gray-800/60 text-gray-200 max-w-[140px]"
    >
      {{ _.castArray(videoItem.tags).join(',') }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('videoItem.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
