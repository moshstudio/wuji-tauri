<script setup lang="ts">
import type { PhotoItem } from '@wuji-tauri/source-extension';
import type { PropType } from 'vue';
import LoadImage from '../../LoadImage.vue';

const { item } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
});

const emit = defineEmits<{
  (e: 'click', item: PhotoItem): void;
}>();
</script>

<template>
  <div
    class="active-bg-scale flex flex-col rounded-lg"
    @click="() => emit('click', item)"
  >
    <LoadImage
      fit="cover"
      :src="typeof item.cover === 'string' ? item.cover : item.cover[0]"
      :headers="item.coverHeaders || undefined"
      class="h-full min-h-[100px] w-full"
      :lazy-load="true"
    />
    <p
      v-if="item.title"
      class="w-full truncate py-1 text-center text-xs text-[var(--van-text-color)]"
    >
      {{ item.title }}
    </p>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('item.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
