<script setup lang="ts">
import _ from 'lodash';
import type { VideoItem } from '@/extensions/video';
import LoadImage from '@/components/LoadImage.vue';
import { useDisplayStore } from '@/store';

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
    class="relative flex flex-col rounded-lg transform transition-all duration-100 cursor-pointer select-none active:scale-[0.98]"
    @click="() => emit('click', videoItem)"
  >
    <LoadImage
      fit="cover"
      lazy-load
      :src="videoItem.cover!"
      :headers="videoItem.coverHeaders || undefined"
      class="w-full h-full"
    />

    <p v-if="videoItem.title" class="text-xs text-center truncate py-1">
      {{ videoItem.title }}
    </p>
    <p
      v-if="videoItem.tags"
      class="absolute text-xs rounded left-0 bottom-6 p-1 truncate bg-gray-800/60 text-gray-200 max-w-full"
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
