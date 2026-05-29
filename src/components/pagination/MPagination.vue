<script setup lang="ts">
import type { PickerConfirmEventParams } from 'vant';
import { LiquidGlassContainer } from '@tinymomentum/liquid-glass-vue';
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    pageNo?: number;
    pageCount?: number | string;
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
    glass-tint-color="#000000"
    :glass-tint-opacity="20"
    :inner-shadow-blur="1"
    class="select-none text-[var(--van-text-color)]"
    :class="[
      useGlass
        ? 'use-glass'
        : 'bg-[var(--van-background)]/50 h-[40px] w-[120px]',
    ]"
  >
    <div class="flex h-full w-full items-center justify-around">
      <div
        class="van-haptics-feedback pagination-btn z-[10] flex h-full w-full flex-1 items-center justify-center rounded-l-[6px] p-2"
        :class="{ disabled: pageNo <= 1 }"
        @click="
          () => {
            if (pageNo > 1) {
              toPage(pageNo - 1);
            }
          }
        "
      >
        <van-icon
          name="arrow-left"
          size="14"
          :color="useGlass ? 'white' : 'var(--van-text-color)'"
        />
      </div>
      <div
        class="pagination-btn z-[10] flex h-full w-full flex-1 items-center justify-center p-2 text-xs"
        :class="useGlass ? 'text-white' : 'text-[var(--van-text-color)]'"
        @click="showPicker = true"
      >
        {{ pageNo }}/{{ pageCount }}
      </div>
      <div
        class="van-haptics-feedback pagination-btn z-[10] flex h-full w-full flex-1 items-center justify-center rounded-r-[6px] p-2"
        :class="{ disabled: pageNo >= Number(pageCount) }"
        @click="
          () => {
            if (pageNo < Number(pageCount)) {
              toPage(pageNo + 1);
            }
          }
        "
      >
        <van-icon
          name="arrow"
          size="14"
          :color="useGlass ? 'white' : 'var(--van-text-color)'"
        />
      </div>
      <!-- <van-button
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
      </van-button> -->
      <van-popup
        v-model:show="showPicker"
        close-on-popstate
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
.pagination-btn {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  &.disabled {
    opacity: 0.2;
    pointer-events: none;
  }
}

.use-glass {
  .pagination-btn {
    &:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }

    &:active {
      background-color: rgba(255, 255, 255, 0.15);
    }
  }
}

:deep(.van-pagination__items) {
  gap: 6px;
}
</style>
