<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import AppMySourceContentEdit from '@/layouts/app/source/MySourceContentEdit.vue';

defineProps<{
  source?: MarketSource;
  sourceContent?: MarketSourceContent;
  save: (source: MarketSource, sourceContent: MarketSourceContent) => void;
}>();
</script>

<template>
  <AppMySourceContentEdit
    :source="source"
    :source-content="sourceContent"
    :save="save"
  />
</template>

<style scoped lang="less"></style>
