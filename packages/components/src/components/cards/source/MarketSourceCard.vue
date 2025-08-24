<script setup lang="ts">
import { MarketSource } from '@wuji-tauri/source-extension';
import LikeButton from '../../LikeButton.vue';
import _ from 'lodash';
import { TagProps } from 'vant';
import { computed } from 'vue';

const props = defineProps<{
  source: MarketSource;
  isImported: boolean;
  click: (source: MarketSource) => void;
  onImport: (source: MarketSource) => void;
  permissionText: (source: MarketSource) => string | undefined;
  permissionStyle: (source: MarketSource) => Partial<TagProps> | undefined;
  onLike: (source: MarketSource) => void;
}>();

const permissionStyle = computed(() => {
  return props.permissionStyle(props.source);
});
</script>

<template>
  <div
    class="active-bg-scale flex flex-col gap-1 rounded-lg bg-[var(--van-background)] p-3"
    @click="() => click(source)"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2 overflow-hidden">
        <div
          class="line-clamp-2 text-base font-bold text-[var(--van-text-color)]"
        >
          {{ source.name }}
        </div>
        <div class="text-xs text-gray-400">v{{ source.version }}</div>
      </div>
      <van-button
        size="small"
        type="primary"
        class="flex-shrink-0"
        :plain="isImported"
        @click.stop="() => onImport(source)"
      >
        {{ isImported ? '已导入' : '导入' }}
      </van-button>
    </div>
    <div class="text-xs text-[var(--van-text-color)]">
      共 {{ source.sourceContents?.length || 0 }} 个源
    </div>
    <van-divider :vertical="false"></van-divider>
    <div class="flex flex-grow items-end justify-between gap-2">
      <van-tag size="medium" v-bind="permissionStyle">
        {{ permissionText(source) }}
      </van-tag>
      <LikeButton
        v-model:count="source.thumbsUp"
        :likeAction="() => onLike(source)"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-divider) {
  margin: 4px 0px;
}
</style>
