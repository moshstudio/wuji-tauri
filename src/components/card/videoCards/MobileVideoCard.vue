<script setup lang="ts">
import _ from 'lodash';
import { Icon } from '@iconify/vue';
import LoadImage from '@/components/LoadImage.vue';
import { VideoItem } from '@/extensions/video';
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
    class="relative flex flex-col gap-2 rounded-lg transform transition-all duration-100 cursor-pointer select-none active:scale-[0.98]"
    @click="() => emit('click', videoItem)"
  >
    <LoadImage
      fit="cover"
      lazy-load
      :src="videoItem.cover!"
      :headers="videoItem.coverHeaders || undefined"
      class="w-full h-full"
    />

    <p class="text-xs text-center truncate" v-if="videoItem.title">
      {{ videoItem.title }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('videoItem.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
