<script setup lang="ts">
import { PhotoItem } from '@/extensions/photo';
import { router } from '@/router';
import { onMounted, PropType, ref } from 'vue';
import LoadImage from '@/components/LoadImage.vue';
import { PhotoSource } from '@/types';
import { useDisplayStore, useStore } from '@/store';

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

const source = ref<PhotoSource>();

const onClick = () => {
  if (selecteMode) {
    selected.value = !selected.value;
    return;
  }
  router.push({
    name: 'PhotoDetail',
    params: { id: item.id, sourceId: item.sourceId },
  });
};

onMounted(() => {
  const store = useStore();
  source.value = store.getPhotoSource(item.sourceId);
});
</script>

<template>
  <div
    class="relative flex flex-col gap-2 rounded-lg transform transition-all duration-100 active:scale-[0.98] cursor-pointer select-none"
    :class="selecteMode ? (selected ? '' : 'opacity-50') : ''"
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
      class="h-[20px] text-xs text-[var(--van-text-color)] text-center truncate"
      v-if="item.title"
    >
      {{ item.title }}
    </p>
    <p
      v-if="source && selecteMode"
      class="absolute top-2 left-2 p-1 text-white bg-black rounded text-xs"
    >
      {{ source.item.name }}
    </p>
    <van-checkbox
      v-model="selected"
      shape="square"
      class="absolute top-2 right-2"
      @click.stop="onClick"
      v-if="selecteMode"
    ></van-checkbox>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: v-bind('item.title ? "0.5rem 0.5rem 0 0" : "0.5rem"');
}
</style>
