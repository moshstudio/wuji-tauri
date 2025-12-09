<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import { castArray } from 'lodash';
import { computed } from 'vue';
import LoadImage from '../../LoadImage.vue';

const props = defineProps<{
  video: VideoItem;
  click: (video: VideoItem) => void;
}>();

const tagsText = computed(() => {
  return castArray(props.video.tags).join(',');
});
</script>

<template>
  <div
    v-tooltip="video.title"
    class="active-bg-scale relative flex flex-col rounded-lg"
    @click="() => click(video)"
  >
    <LoadImage
      fit="cover"
      :src="video.cover!"
      :headers="video.coverHeaders || undefined"
      class="h-full min-h-[120px] w-full"
    />

    <p
      v-if="video.title"
      class="flex-shrink-0 truncate py-1 text-center text-xs"
    >
      {{ video.title }}
    </p>
    <p
      v-if="video.tags"
      class="absolute bottom-[22px] left-0 max-w-full truncate rounded bg-gray-800/60 p-1 text-xs text-gray-200"
    >
      {{ tagsText }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('video.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
