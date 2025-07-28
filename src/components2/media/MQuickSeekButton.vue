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
    class="pointer-events-none flex w-full items-center justify-around gap-1"
  >
    <button
      class="pointer-events-auto flex items-center justify-center rounded-full p-1 transition-all duration-300 focus:outline-none active:scale-95"
      @click.stop="() => quickBack(seconds)"
    >
      <Icon
        icon="tabler:rewind-backward-10"
        color="rgb(209 213 219 / var(--tw-text-opacity, 1))"
        :width="40"
        :height="40"
      />
    </button>
    <button
      class="pointer-events-auto flex items-center justify-center rounded-full p-1 transition-all duration-300 focus:outline-none active:scale-95"
      @click.stop="() => quickForward(seconds)"
    >
      <Icon
        icon="tabler:rewind-forward-10"
        color="rgb(209 213 219 / var(--tw-text-opacity, 1))"
        :width="40"
        :height="40"
      />
    </button>
  </div>
</template>

<style scoped></style>
