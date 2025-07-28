<script setup lang="ts">
import _ from 'lodash';
import type { VideoItem } from '@wuji-tauri/source-extension';
import LoadImage from '../../LoadImage.vue';

defineProps<{
  video: VideoItem;
  click: (video: VideoItem) => void;
}>();
</script>

<template>
  <div
    class="active-bg-scale relative flex flex-col rounded-lg"
    @click="() => click(video)"
  >
    <LoadImage
      fit="cover"
      :src="video.cover!"
      :headers="video.coverHeaders || undefined"
      class="h-full w-full"
    />

    <p v-if="video.title" class="truncate py-1 text-center text-xs">
      {{ video.title }}
    </p>
    <p
      v-if="video.tags"
      class="absolute bottom-6 left-0 max-w-full truncate rounded bg-gray-800/60 p-1 text-xs text-gray-200"
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
