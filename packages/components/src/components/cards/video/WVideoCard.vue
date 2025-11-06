<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import MVideoCard from './MVideoCard.vue';

defineProps<{
  video: VideoItem;
  click: (item: VideoItem) => void;
}>();
</script>

<template>
  <MVideoCard :video="video" :click="click"></MVideoCard>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('video.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
