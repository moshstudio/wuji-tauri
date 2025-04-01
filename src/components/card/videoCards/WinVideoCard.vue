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
    class="relative flex flex-col gap-2 w-[140px] rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
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
      class="text-xs text-[var(--van-text-color)] text-center truncate"
      v-if="videoItem.title"
    >
      {{ videoItem.title }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('videoItem.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
