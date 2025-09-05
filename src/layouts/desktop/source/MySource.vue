<script setup lang="ts">
import type { MarketSource } from '@wuji-tauri/source-extension';
import type { TagProps } from 'vant';
import AppMySource from '@/layouts/app/source/MySource.vue';

defineProps<{
  sources?: MarketSource[];
  refresh: () => void;
  permissionText: (source: MarketSource) => string | undefined;
  permissionStyle: (source: MarketSource) => Partial<TagProps> | undefined;
  createSource: () => void;
  onClick: (source: MarketSource) => void;
  showMoreOptions: (source: MarketSource) => void;
}>();

const isFreshing = defineModel<boolean>('isFreshing');
</script>

<template>
  <AppMySource
    v-model:is-freshing="isFreshing"
    :sources="sources"
    :refresh="refresh"
    :permission-text="permissionText"
    :permission-style="permissionStyle"
    :create-source="createSource"
    :on-click="onClick"
    :show-more-options="showMoreOptions"
  />
</template>

<style scoped lang="less"></style>
