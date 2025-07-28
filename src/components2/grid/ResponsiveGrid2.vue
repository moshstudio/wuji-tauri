<script setup lang="ts">
import { useAttrs, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    gap?: number;
    minWidth?: string | number;
    maxWidth?: string | number;
  }>(),
  {
    gap: 2,
    minWidth: 200,
    maxWidth: 300,
  },
);

const parseDimension = (value: string | number): string => {
  // If it's a number, just add 'px'
  if (typeof value === 'number') return `${value}px`;

  // If it's a string that can be converted to a number, treat it as px value
  if (!isNaN(Number(value))) return `${value}px`;

  // Otherwise, assume it's a valid CSS dimension (like '10rem', '50%', etc.)
  return value;
};

const minWidth = computed(() => parseDimension(props.minWidth));
const maxWidth = computed(() => parseDimension(props.maxWidth));

const attrs = useAttrs();
</script>

<template>
  <div
    class="grid w-full"
    :class="[attrs.class, `p-${gap}`, `gap-${gap}`]"
    :style="{
      'grid-template-columns': `repeat(auto-fill, minmax(min(${maxWidth}, max(${minWidth}, 100%)), 1fr))`,
    }"
  >
    <slot></slot>
  </div>
</template>
