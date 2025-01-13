<script setup lang="ts">
const model = defineModel<number>();
const props = defineProps({
  pageCount: {
    type: [Number, String],
    required: false,
  },
  totalItems: {
    type: [Number, String],
    required: false,
  },
  itemsPerPage: {
    type: [Number, String],
    required: false,
  },
  showPageSize: {
    type: [Number, String],
    required: false,
  },
  class: {
    type: String,
    required: false,
  },
});
const emit = defineEmits<{
  (e: "change", page: number): Promise<void>;
}>();

const toPage = (page: number) => {
  emit("change", page);
};
</script>

<template>
  <van-pagination
    v-model="model"
    :page-count="props.pageCount"
    :items-per-page="props.itemsPerPage"
    :total-items="props.totalItems"
    mode="simple"
    class="w-[140px]"
    :class="props.class"
    @change="toPage"
  >
    <template #prev-text>
      <van-icon name="arrow-left" />
    </template>
    <template #next-text>
      <van-icon name="arrow" />
    </template>
  </van-pagination>
</template>

<style scoped lang="less">
:deep(.van-pagination__items) {
  gap: 6px;
}
</style>
