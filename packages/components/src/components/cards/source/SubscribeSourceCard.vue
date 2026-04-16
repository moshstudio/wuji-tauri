<script setup lang="ts">
import type {
  SubscribeItem,
  SubscribeSource,
} from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import { getSourceTypeProperty } from '../../../utils/source';

const props = defineProps<{
  source: SubscribeSource;
  item: SubscribeItem;
  onClick: (source: SubscribeSource, item: SubscribeItem) => void;
}>();

const typeProperty = computed(() => getSourceTypeProperty(props.item.type));
</script>

<template>
  <van-cell clickable @click="() => onClick(source, item)">
    <template #title>
      <div class="flex items-center gap-2">
        <van-tag
          :color="typeProperty.bgColor"
          :text-color="typeProperty.textColor"
        >
          {{ typeProperty.name }}
        </van-tag>
        <div>
          {{ item.name }}
        </div>
      </div>
    </template>
    <template #value>
      <slot name="right" />
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
