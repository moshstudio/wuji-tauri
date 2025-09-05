<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import { SourceType } from '@wuji-tauri/source-extension';

defineProps<{
  source: MarketSource;
  item: MarketSourceContent;
  onClick: (source: MarketSource, item: MarketSourceContent) => void;
}>();

function getTypeProperty(type: SourceType) {
  switch (type) {
    case SourceType.Book:
      return {
        name: '书籍',
        bgColor: '#dcfce7',
        textColor: '#166534',
      };
    case SourceType.Comic:
      return {
        name: '漫画',
        bgColor: '#fef3c7',
        textColor: '#92400e',
      };
    case SourceType.Photo:
      return {
        name: '图片',
        bgColor: '#f5f5f5',
        textColor: '#525252',
      };
    case SourceType.Song:
      return {
        name: '音乐',
        bgColor: '#fce7f3',
        textColor: '#9d174d',
      };
    case SourceType.Video:
      return {
        name: '影视',
        bgColor: '#fee2e2',
        textColor: '#991b1b',
      };
    case SourceType.Resource:
      return {
        name: '资源',
        bgColor: '#e0e7ff',
        textColor: '#4338ca',
      };
  }
}
</script>

<template>
  <van-cell
    clickable
    class="flex items-center gap-2"
    @click="() => onClick(source, item)"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <van-tag
          :color="getTypeProperty(item.type).bgColor"
          :text-color="getTypeProperty(item.type).textColor"
          class="flex-shrink-0"
        >
          {{ getTypeProperty(item.type).name }}
        </van-tag>
        <div class="truncate">
          {{ item.name }}
        </div>
      </div>
    </template>
    <template #value>
      <slot name="right" />
    </template>
  </van-cell>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex-grow: 1;
  display: flex;
  overflow: hidden;
}
:deep(.van-cell__value) {
  flex: none;
  flex-shrink: 0;
}
</style>
