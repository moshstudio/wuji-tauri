<script setup lang="ts">
import {
  SourceType,
  SubscribeItem,
  SubscribeSource,
} from '@wuji-tauri/source-extension';

defineProps<{
  source: SubscribeSource;
  item: SubscribeItem;
  onClick: (source: SubscribeSource, item: SubscribeItem) => void;
}>();

const getTypeProperty = (type: SourceType) => {
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
};
</script>

<template>
  <van-cell clickable @click="() => onClick(source, item)">
    <template #title>
      <div class="flex items-center gap-2">
        <van-tag
          :color="getTypeProperty(item.type).bgColor"
          :text-color="getTypeProperty(item.type).textColor"
        >
          {{ getTypeProperty(item.type).name }}
        </van-tag>
        <div>
          {{ item.name }}
        </div>
      </div>
    </template>
    <template #value>
      <slot name="right"></slot>
      <!-- <div class="flex items-center gap-3">
        <div
          class="van-haptics-feedback rounded p-1 text-white"
          :class="item.disable ? 'bg-gray-400' : 'bg-green-500'"
        >
          <Icon
            :icon="item.disable ? 'lsicon:disable-outline' : 'mdi:success'"
            width="16"
            height="16"
          />
        </div>
        <div
          v-if="isLocalSource(source)"
          class="van-haptics-feedback bg-red rounded p-1 text-white"
          @click.stop="removeItem(source, item)"
        >
          <Icon icon="mdi:delete-outline" width="16" height="16" />
        </div>
      </div> -->
    </template>
  </van-cell>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: none;
  flex-grow: 1;
}
:deep(.van-cell__value) {
  flex: none;
}
</style>
