<script setup lang="ts">
import { useAttrs } from 'vue';

const { baseCols, gap } = defineProps({
  baseCols: {
    type: Number,
    default: 1,
  },
  gap: {
    type: Number,
    default: 4,
  },
});
const attrs = useAttrs();
</script>

<template>
  <div
    class="grid"
    :class="[
      attrs.class,
      `p-${gap}`,
      `gap-${gap}`,
      `grid-cols-${baseCols}`,
      `xs:grid-cols-${baseCols}`,
      `sm:grid-cols-${baseCols + 1}`,
      `md:grid-cols-${baseCols + 1}`,
      `lg:grid-cols-${baseCols + 2}`,
      `xl:grid-cols-${baseCols + 2}`,
      `2xl:grid-cols-${baseCols + 3}`,
      `3xl:grid-cols-${baseCols + 3}`,
      `4xl:grid-cols-${baseCols + 4}`,
      `5xl:grid-cols-${baseCols + 4}`,
      `6xl:grid-cols-${baseCols + 5}`,
    ]"
  >
    <slot />
  </div>
</template>

<style scoped lang="less"></style>
