<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import LoadImage from '../../LoadImage.vue';
import _ from 'lodash';

defineProps<{
  video: VideoItem;
  click: (item: VideoItem) => void;
}>();
</script>

<template>
  <div
    class="active-bg-scale relative flex w-[140px] flex-col rounded-lg"
    @click="() => click(video)"
  >
    <LoadImage
      :width="140"
      :height="200"
      fit="cover"
      :src="video.cover!"
      :headers="video.coverHeaders || undefined"
      class="rounded-t-lg"
    />

    <p
      v-if="video.title"
      class="truncate py-1 text-center text-xs text-[var(--van-text-color)]"
    >
      {{ video.title }}
    </p>
    <p
      v-if="video.tags"
      class="absolute bottom-6 left-0 max-w-[140px] truncate rounded bg-gray-800/60 p-1 text-xs text-gray-200"
    >
      {{ _.castArray(video.tags).join(',') }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('video.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
