<script setup lang="ts">
import type { PickerConfirmEventParams } from 'vant';
import { computed, ref } from 'vue';

const props = defineProps({
  pageCount: {
    type: [Number, String],
    required: false,
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
const showPicker = ref(false);
const columns = computed(() => {
  const pageCount = Number(props.pageCount);
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push({ text: i, value: i });
  }
  return pages;
});

function toPage(page: number) {
  emit('change', page);
}
function changePage(params: PickerConfirmEventParams) {
  if (params.selectedValues.length) {
    const newPage = Number(params.selectedValues[0]);
    if (newPage !== currentPage.value) {
      toPage(newPage);
    }
  }
  showPicker.value = false;
}
</script>

<template>
  <div
    class="simple-pagination flex gap-2 items-center select-none text-[--van-text-color]"
  >
    <van-button
      :plain="true"
      size="small"
      :disabled="currentPage <= 1"
      @click="() => toPage(currentPage - 1)"
    >
      <van-icon name="arrow-left" size="14" />
    </van-button>
    <div class="text-xs cursor-pointer" @click="showPicker = true">
      {{ currentPage }}/{{ props.pageCount }}
    </div>
    <van-button
      :plain="true"
      size="small"
      :disabled="currentPage >= Number(props.pageCount)"
      @click="() => toPage(currentPage + 1)"
    >
      <van-icon name="arrow" size="14" />
    </van-button>
    <van-popup
      v-model:show="showPicker"
      destroy-on-close
      round
      position="bottom"
      teleport="body"
    >
      <van-picker
        title="选择页码"
        :columns="columns"
        class="text-[var(--van-text-color)]"
        @cancel="showPicker = false"
        @confirm="changePage"
      />
    </van-popup>
  </div>

  <!-- <van-pagination
    v-model="model"
    :page-count="props.pageCount"
    :items-per-page="props.itemsPerPage"
    :total-items="props.totalItems"
    mode="simple"
    class="w-[140px] text-xs"
    :class="props.class"
    @change="toPage"
  >
    <template #prev-text>
      <van-icon name="arrow-left" />
    </template>
    <template #next-text>
      <van-icon name="arrow" />
    </template>
  </van-pagination> -->
</template>

<style scoped lang="less">
:deep(.van-pagination__items) {
  gap: 6px;
}
</style>
