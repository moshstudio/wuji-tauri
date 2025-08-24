<script setup lang="ts">
import { MarketSource } from '@wuji-tauri/source-extension';
import { MarketSourceContentCard } from '@wuji-tauri/components/src';
import _ from 'lodash';
import { permissionStyle, permissionText } from '@/utils/marketSource';

const show = defineModel<boolean>('show');

const props = defineProps<{
  source?: MarketSource;
}>();
</script>

<template>
  <van-action-sheet v-model:show="show" title="订阅源详情" class="p-2">
    <van-cell title="名称" :value="source?.name"></van-cell>
    <div v-if="source" class="flex items-center gap-2 px-4 py-1">
      <van-tag type="primary">v{{ source.version }}</van-tag>
      <van-tag v-bind="permissionStyle(source)">
        {{ permissionText(source) }}
      </van-tag>
    </div>
    <van-list v-if="source">
      <MarketSourceContentCard
        v-for="(sourceContent, index) in source.sourceContents"
        :key="index"
        :source="source"
        :item="sourceContent"
        :onClick="() => {}"
      ></MarketSourceContentCard>
    </van-list>
  </van-action-sheet>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  width: 40px;
}
</style>
