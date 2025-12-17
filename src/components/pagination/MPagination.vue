<script setup lang="ts">
import type { PickerConfirmEventParams } from 'vant';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    pageNo?: number;
    pageCount: number | string;
    toPage: (page: number) => void;
    useGlass?: boolean;
  }>(),
  {
    pageNo: 1,
    pageCount: 1,
    useGlass: false,
  },
);

const showPicker = ref(false);
const selectedValues = computed({
  get() {
    return [props.pageNo];
  },
  set(_) {},
});

const columns = computed(() => {
  const pageCount = Number(props.pageCount);
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    pages.push({ text: i, value: i });
  }
  return pages;
});

function changePage(params: PickerConfirmEventParams) {
  if (params.selectedValues.length) {
    const newPage = Number(params.selectedValues[0]);
    if (newPage !== props.pageNo) {
      props.toPage(newPage);
    }
  }
  showPicker.value = false;
}
</script>

<template>
  <component
    :is="useGlass ? LiquidGlassContainer : 'div'"
    :width="120"
    :height="40"
    :border-radius="6"
    :innerShadowBlur="0"
    class="select-none p-1 text-[var(--van-text-color)]"
    :class="useGlass ? '' : 'bg-[var(--van-background)]/50'"
  >
    <div class="flex h-full w-full items-center justify-around gap-2">
      <van-button
        :plain="true"
        size="small"
        :disabled="pageNo <= 1"
        @click="() => toPage(pageNo - 1)"
      >
        <van-icon name="arrow-left" size="14" />
      </van-button>
      <div class="z-[10] cursor-pointer text-xs" @click="showPicker = true">
        {{ pageNo }}/{{ pageCount }}
      </div>
      <van-button
        :plain="true"
        size="small"
        :disabled="pageNo >= Number(pageCount)"
        @click="() => toPage(pageNo + 1)"
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
          v-model="selectedValues"
          title="选择页码"
          :columns="columns"
          class="text-[var(--van-text-color)]"
          @cancel="showPicker = false"
          @confirm="changePage"
        />
      </van-popup>
    </div>
  </component>
</template>

<style scoped lang="less">
:deep(.van-pagination__items) {
  gap: 6px;
}
</style>
