<script setup lang="ts">
import type { MarketSource } from '@wuji-tauri/source-extension';
import type { TagProps } from 'vant';
import { computed } from 'vue';

const props = defineProps<{
  source: MarketSource;
  click: (source: MarketSource) => void;
  permissionText: (source: MarketSource) => string | undefined;
  permissionStyle: (source: MarketSource) => Partial<TagProps> | undefined;
  showMoreOptions: (source: MarketSource) => void;
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
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 overflow-hidden">
        <div
          class="line-clamp-2 text-base font-bold text-[var(--van-text-color)]"
        >
          {{ source.name }}
        </div>
        <div class="text-xs text-gray-400">v{{ source.version }}</div>
      </div>
      <van-button
        size="mini"
        icon="arrow-down"
        plain
        @click.stop="
          () => {
            showMoreOptions(source);
          }
        "
      />
    </div>
    <div class="text-xs text-[var(--van-text-color)]">
      共 {{ source.sourceContents?.length || 0 }} 个源
    </div>
    <van-divider :vertical="false" />
    <div class="flex items-center gap-2">
      <van-tag
        size="medium"
        type="success"
        :plain="source.isPublic ? false : true"
      >
        {{ source.isPublic ? '公开' : '私有' }}
      </van-tag>
      <van-tag v-if="source.isBanned" size="medium" type="danger">封禁</van-tag>
    </div>
    <div class="flex items-center gap-2">
      <van-tag size="medium" v-bind="permissionStyle">
        {{ permissionText(source) }}
      </van-tag>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-divider) {
  margin: 4px 0px;
}
</style>
