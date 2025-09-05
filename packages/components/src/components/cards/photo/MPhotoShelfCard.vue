<script setup lang="ts">
import type { PhotoItem, PhotoSource } from '@wuji-tauri/source-extension';
import type { PropType } from 'vue';
import LoadImage from '../../LoadImage.vue';

const { item, selecteMode, source } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
  selecteMode: {
    type: Boolean,
    default: false,
  },
  source: {
    type: Object as PropType<PhotoSource | undefined>,
    required: true,
  },
});
const emit = defineEmits<{
  (e: 'click', item: PhotoItem, source?: PhotoSource): void;
}>();

const selected = defineModel('selected');

function onClick() {
  if (selecteMode) {
    selected.value = !selected.value;
    return;
  }
  emit('click', item, source);
}
</script>

<template>
  <div
    class="active-bg-scale flex flex-col rounded-lg"
    :class="selecteMode ? (selected ? '' : 'opacity-50') : ''"
    @click="onClick"
  >
    <LoadImage
      fit="cover"
      :src="typeof item.cover === 'string' ? item.cover : item.cover[0]"
      :headers="item.coverHeaders || undefined"
      class="h-full min-h-[100px] w-full"
    />

    <p
      v-if="item.title"
      class="w-full truncate py-1 text-center text-xs text-[var(--van-text-color)]"
    >
      {{ item.title }}
    </p>
    <p
      v-if="source && selecteMode"
      class="absolute left-2 top-2 rounded bg-black p-1 text-xs text-white"
    >
      {{ source.item.name }}
    </p>
    <van-checkbox
      v-if="selecteMode"
      v-model="selected"
      shape="square"
      class="absolute right-2 top-2"
      @click.stop="onClick"
    />
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('item.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
