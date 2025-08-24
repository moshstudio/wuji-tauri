<script setup lang="ts">
import { useElementResize } from '@/utils';
import { computed, ref } from 'vue';

const currentPage = defineModel<number>({ required: true });
const props = withDefaults(
  defineProps<{
    pageCount: number | string;
    maxPageSize: number | string;
    class?: string;
    toPage: (page: number) => void;
  }>(),
  {
    maxPageSize: 30,
  },
);

const container = ref<HTMLElement>();
const width = ref(0);

function calcSize() {
  if (!container.value) return 2;
  let splits = Math.ceil(width.value / 44);

  if (splits < 6) splits = 6;
  splits = splits - 5;
  if (splits > Number(props.maxPageSize)) {
    return Number(props.maxPageSize);
  } else {
    return splits;
  }
}

const columns = computed(calcSize);

useElementResize('.paginator', (w, h) => {
  width.value = w;
});
</script>

<template>
  <div ref="container" class="paginator w-full">
    <van-pagination
      v-model="currentPage"
      :page-count="pageCount"
      :show-page-size="columns"
      class="text-xs"
      :class="class"
      force-ellipses
      @change="toPage"
    >
      <template #prev-text>
        <van-icon name="arrow-left" />
      </template>
      <template #next-text>
        <van-icon name="arrow" />
      </template>
      <template #page="{ text }">
        {{ text }}
      </template>
    </van-pagination>
  </div>
</template>

<style scoped lang="less">
:deep(.van-pagination__items) {
  gap: 6px;
}
</style>
