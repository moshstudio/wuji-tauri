<script setup lang="ts">
import type { PhotoItem } from '@/extensions/photo';
import type { PropType } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import { router } from '@/router';

const { item } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
});
const selected = defineModel('selected', { type: Boolean, default: false });

function onClick() {
  router.push({
    name: 'PhotoDetail',
    params: { id: item.id, sourceId: item.sourceId },
  });
}
</script>

<template>
  <div
    class="relative flex flex-col rounded-lg transform transition-all duration-100 active:scale-[0.98] cursor-pointer select-none"
    @click="onClick"
  >
    <LoadImage
      fit="cover"
      lazy-load
      :src="typeof item.cover === 'string' ? item.cover : item.cover[0]"
      :headers="item.coverHeaders || undefined"
      class="w-full h-full"
    />
    <p
      v-if="item.title"
      class="text-xs text-[var(--van-text-color)] text-center truncate py-1"
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
