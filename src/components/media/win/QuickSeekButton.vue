<script setup lang="ts">
import { Icon } from '@iconify/vue';

const props = defineProps<{
  seconds: number;
  quickBack: (value: number) => void;
  quickForward: (value: number) => void;
}>();
</script>

<template>
  <div class="flex items-center justify-center gap-1">
    <button
      class="flex items-center justify-center p-1 rounded-full active:scale-95 transition-all duration-300 focus:outline-none"
      @click="() => quickBack(seconds)"
    >
      <Icon
        icon="mingcute:rewind-backward-10-line"
        color="rgb(209 213 219 / var(--tw-text-opacity, 1))"
        :width="20"
        :height="20"
      />
    </button>
    <button
      class="flex items-center justify-center p-1 rounded-full active:scale-95 transition-all duration-300 focus:outline-none"
      @click="() => quickForward(seconds)"
    >
      <Icon
        icon="mingcute:rewind-forward-10-line"
        color="rgb(209 213 219 / var(--tw-text-opacity, 1))"
        :width="20"
        :height="20"
      />
    </button>
  </div>
</template>

<style scoped></style>
