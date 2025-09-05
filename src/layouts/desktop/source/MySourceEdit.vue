<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import AppMySourceEdit from '@/layouts/app/source/MySourceEdit.vue';

defineProps<{
  source?: MarketSource;
  save: (source: MarketSource) => void;
  clickSourceContent: (
    source: MarketSource,
    content: MarketSourceContent,
  ) => void;
  deleteSourceContent: (
    source: MarketSource,
    content: MarketSourceContent,
  ) => void;
}>();
</script>

<template>
  <AppMySourceEdit
    :source="source"
    :save="save"
    :click-source-content="clickSourceContent"
    :delete-source-content="deleteSourceContent"
  />
</template>

<style scoped lang="less"></style>
