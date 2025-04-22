<script setup lang="ts">
import type { PhotoItem } from '@/extensions/photo';
import type { PhotoSource } from '@/types';
import type { PropType } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import { router } from '@/router';
import { useStore } from '@/store';
import { computed, onMounted, ref } from 'vue';

const store = useStore();

const { item, selecteMode } = defineProps({
  item: {
    type: Object as PropType<PhotoItem>,
    required: true,
  },
  selecteMode: {
    type: Boolean,
    default: false,
  },
});
const selected = defineModel('selected');

function onClick() {
  if (selecteMode) {
    selected.value = !selected.value;
    return;
  }
  router.push({
    name: 'PhotoDetail',
    params: { id: item.id, sourceId: item.sourceId },
  });
}

const sourceName = computed(() => {
  const source = store.getPhotoSource(item.sourceId);
  return source?.item.name || '';
});
</script>

<template>
  <div
    class="relative flex flex-col rounded-lg transform transition-all duration-100 cursor-pointer select-none active:bg-[--van-background]"
    :class="selecteMode ? (selected ? '' : 'opacity-50') : ''"
    @click="onClick"
  >
    <LoadImage
      fit="cover"
      lazy-load
      :src="typeof item.cover === 'string' ? item.cover : item.cover[0]"
      :headers="item.coverHeaders || undefined"
      class="h-full"
    />

    <p
      v-if="item.title"
      class="text-xs text-center text-[var(--van-text-color)] truncate py-1"
    >
      {{ item.title }}
    </p>
    <p
      v-if="selecteMode && sourceName"
      class="absolute top-2 left-2 p-1 text-white bg-black rounded text-xs"
    >
      {{ sourceName }}
    </p>
    <van-checkbox
      v-if="selecteMode"
      v-model="selected"
      shape="square"
      class="absolute top-2 right-2"
      @click.stop="onClick"
    />
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('item.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
