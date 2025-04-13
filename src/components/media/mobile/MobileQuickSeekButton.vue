<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  seconds: number;
  quickBack: (value: number) => void;
  quickForward: (value: number) => void;
}>();
</script>

<template>
  <div
    class="w-full flex items-center justify-around gap-1 pointer-events-none"
  >
    <button
      class="flex items-center justify-center p-1 rounded-full active:scale-95 transition-all duration-300 focus:outline-none pointer-events-auto"
      @click.stop="() => quickBack(seconds)"
    >
      <Icon
        icon="mingcute:rewind-backward-10-line"
        color="rgb(209 213 219 / var(--tw-text-opacity, 1))"
        :width="40"
        :height="40"
      />
    </button>
    <button
      class="flex items-center justify-center p-1 rounded-full active:scale-95 transition-all duration-300 focus:outline-none pointer-events-auto"
      @click.stop="() => quickForward(seconds)"
    >
      <Icon
        icon="mingcute:rewind-forward-10-line"
        color="rgb(209 213 219 / var(--tw-text-opacity, 1))"
        :width="40"
        :height="40"
      />
    </button>
  </div>
</template>

<style scoped></style>
