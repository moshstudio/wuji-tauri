<script setup lang="ts">
import { PhotoItem } from '@/extensions/photo';
import { router } from '@/router';
import { onMounted, PropType, ref } from 'vue';
import LoadImage from '../LoadImage.vue';
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
const selected = defineModel('selected', { type: Boolean, default: false });

const displayStore = useDisplayStore();
const deleteButtonVisible = ref(false);
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

function onMouseEnter() {
  deleteButtonVisible.value = true;
}
function onMouseLeave() {
  deleteButtonVisible.value = false;
}
onMounted(() => {
  const store = useStore();
  source.value = store.getPhotoSource(item.sourceId);
});
</script>

<template>
  <div
    class="relative flex flex-col max-w-[160px] bg-[--van-background] rounded-lg shadow transform transition-all duration-100 hover:-translate-y-1 hover:shadow-md cursor-pointer select-none active:bg-[--van-background-2]"
    :class="selecteMode ? (selected ? '' : 'opacity-50') : ''"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <template v-if="typeof item.cover === 'string'">
      <LoadImage
        :width="!displayStore.isMobile ? 160 : undefined"
        :height="!displayStore.isMobile ? 200 : undefined"
        fit="cover"
        lazy-load
        :src="item.cover!"
        :headers="item.coverHeaders || undefined"
        :class="item.title ? 'rounded-t-lg' : 'rounded-lg'"
      />
    </template>
    <template v-else>
      <van-image
        width="160"
        height="200"
        fit="cover"
        lazy-load
        :src="item.cover[0]"
        class="rounded-t-lg"
      />
    </template>
    <van-text-ellipsis
      rows="2"
      :content="item.title"
      class="text-xs p-2 text-[--van-text-color]"
      v-if="item.title"
    >
    </van-text-ellipsis>
    <p
      v-if="source && selecteMode"
      class="absolute top-2 left-2 text-white text-xs"
    >
      {{ source.item.name }}
    </p>
    <van-checkbox
      v-model="selected"
      shape="square"
      class="absolute top-2 right-2"
      @click.self
      v-if="selecteMode"
    ></van-checkbox>
  </div>
</template>

<style scoped lang="less">
:deep(.van-image__img) {
  border-radius: 0.5rem 0.5rem 0 0;
}
</style>
