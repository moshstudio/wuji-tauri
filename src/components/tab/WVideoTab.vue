<script setup lang="ts">
import type { VideoItem } from '@wuji-tauri/source-extension';
import type { VideoSource } from '@/types';
import MVideoTab from './MVideoTab.vue';

defineProps<{
  source: VideoSource;
  toPage: (source: VideoSource, pageNo?: number, type?: string) => void;
  toDetail: (source: VideoSource, item: VideoItem) => void;
}>();
</script>

<template>
  <MVideoTab
    v-bind="$attrs"
    :source="source"
    :to-page="toPage"
    :to-detail="toDetail"
  />
</template>

<style scoped lang="less"></style>
