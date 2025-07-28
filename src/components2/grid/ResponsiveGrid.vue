<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, useAttrs } from 'vue';

const props = defineProps({
  baseCols: {
    type: Number,
    default: 1,
  },
  gap: {
    type: Number,
    default: 4,
  },
  breakpoints: {
    type: Object,
    default: () => ({
      xs: 360,
      sm: 640,
      md: 700,
      lg: 865,
      xl: 1000,
      '2xl': 1280,
      '3xl': 1560,
      '4xl': 1920,
      '5xl': 2560,
      '6xl': 3840,
    }),
  },
});

const attrs = useAttrs();
const gridRef = ref<HTMLElement | null>(null);
const currentCols = ref(props.baseCols);

const updateColumns = () => {
  if (!gridRef.value) return;

  const width = gridRef.value.clientWidth;
  const { breakpoints, baseCols } = props;

  // Determine which breakpoint we're at
  if (width >= breakpoints['6xl']) {
    currentCols.value = baseCols + 10;
  } else if (width >= breakpoints['5xl']) {
    currentCols.value = baseCols + 9;
  } else if (width >= breakpoints['4xl']) {
    currentCols.value = baseCols + 8;
  } else if (width >= breakpoints['3xl']) {
    currentCols.value = baseCols + 7;
  } else if (width >= breakpoints['2xl']) {
    currentCols.value = baseCols + 6;
  } else if (width >= breakpoints.xl) {
    currentCols.value = baseCols + 5;
  } else if (width >= breakpoints.lg) {
    currentCols.value = baseCols + 4;
  } else if (width >= breakpoints.md) {
    currentCols.value = baseCols + 3;
  } else if (width >= breakpoints.sm) {
    currentCols.value = baseCols + 2;
  } else if (width >= breakpoints.xs) {
    currentCols.value = baseCols + 1;
  } else {
    currentCols.value = baseCols;
  }
};

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (gridRef.value) {
    updateColumns();
    observer = new ResizeObserver(updateColumns);
    observer.observe(gridRef.value);
  }
});

onBeforeUnmount(() => {
  if (observer && gridRef.value) {
    observer.unobserve(gridRef.value);
  }
});
</script>

<template>
  <div
    ref="gridRef"
    class="grid"
    :class="[attrs.class, `p-${gap}`, `gap-${gap}`]"
    :style="{
      'grid-template-columns': `repeat(${currentCols}, minmax(0, 1fr))`,
    }"
  >
    <slot></slot>
  </div>
</template>

<style scoped lang="less">
.grid {
  display: grid;
  width: 100%;
}
</style>
