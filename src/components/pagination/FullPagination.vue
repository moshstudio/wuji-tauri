<script setup lang="ts">
import { useElementResize } from '@/utils';
import { computed, ref } from 'vue';

const props = defineProps({
  pageCount: {
    type: [Number, String],
    required: false,
  },
  maxPageSize: {
    type: [Number, String],
    required: false,
    default: 30,
  },
  class: {
    type: String,
    required: false,
  },
});
const emit = defineEmits<{
  (e: 'change', page: number): Promise<void>;
}>();
const currentPage = defineModel({ type: Number, required: true });
const container = ref<HTMLElement>();
const width = ref(0);

function calcSize() {
  if (!container.value)
    return 2;
  let splits = Math.ceil(width.value / 44);

  if (splits < 6)
    splits = 6;
  splits = splits - 5;
  if (splits > Number(props.maxPageSize)) {
    return Number(props.maxPageSize);
  }
  else {
    return splits;
  }
}

const columns = computed(calcSize);

useElementResize('.paginator', (w, h) => {
  width.value = w;
});

function toPage(page: number) {
  emit('change', page);
}
</script>

<template>
  <div ref="container" class="paginator w-full">
    <van-pagination
      v-model="currentPage"
      :page-count="props.pageCount"
      :show-page-size="columns"
      class="text-xs"
      :class="props.class"
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
