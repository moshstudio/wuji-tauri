<script setup lang="ts">
import _ from 'lodash';
import {
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
    :sourceContent="sourceContent"
    :save="save"
  ></AppMySourceContentEdit>
</template>

<style scoped lang="less"></style>
