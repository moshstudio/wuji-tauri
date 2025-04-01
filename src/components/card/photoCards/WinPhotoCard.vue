<script setup lang="ts">
import { PhotoItem } from '@/extensions/photo';
import { router } from '@/router';
import { onMounted, PropType, ref } from 'vue';
import LoadImage from '@/components/LoadImage.vue';

const { item } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
});
const selected = defineModel('selected', { type: Boolean, default: false });

const onClick = () => {
  router.push({
    name: 'PhotoDetail',
    params: { id: item.id, sourceId: item.sourceId },
  });
};
</script>

<template>
  <div
    class="relative flex flex-col gap-2 w-[160px] rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    @click="onClick"
  >
    <LoadImage
      :width="160"
      :height="200"
      fit="cover"
      lazy-load
      :src="typeof item.cover === 'string' ? item.cover : item.cover[0]"
      :headers="item.coverHeaders || undefined"
    />
    <p
      class="h-[20px] text-xs text-center text-[var(--van-text-color)] truncate"
      v-if="item.title"
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
