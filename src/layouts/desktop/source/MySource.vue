<script setup lang="ts">
import { MarketSource } from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { TagProps } from 'vant';
import AppMySource from '@/layouts/app/source/MySource.vue';

const isFreshing = defineModel<boolean>('isFreshing');

defineProps<{
  sources?: MarketSource[];
  refresh: () => void;
  permissionText: (source: MarketSource) => string | undefined;
  permissionStyle: (source: MarketSource) => Partial<TagProps> | undefined;
  createSource: () => void;
  onClick: (source: MarketSource) => void;
  showMoreOptions: (source: MarketSource) => void;
}>();
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
  ></AppMySource>
</template>

<style scoped lang="less"></style>
