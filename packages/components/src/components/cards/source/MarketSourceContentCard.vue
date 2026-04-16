<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import { getSourceTypeProperty } from '../../../utils/source';

const props = defineProps<{
  source: MarketSource;
  item: MarketSourceContent;
  onClick: (source: MarketSource, item: MarketSourceContent) => void;
}>();

const typeProperty = computed(() => getSourceTypeProperty(props.item.type));
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
          :color="typeProperty.bgColor"
          :text-color="typeProperty.textColor"
          class="flex-shrink-0"
        >
          {{ typeProperty.name }}
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
