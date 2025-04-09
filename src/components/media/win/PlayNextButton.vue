<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Icon } from '@iconify/vue';
const props = defineProps<{
  playNext: () => void;
}>();
</script>

<template>
  <button
    @click="playNext"
    class="flex items-center justify-center rounded-full active:scale-95 transition-all duration-300 focus:outline-none"
  >
    <div class="relative w-[24px] h-[24px]">
      <Icon
        :icon="'mdi:skip-next'"
        class="absolute inset-0 transform transition-all duration-300"
        :width="24"
        :height="24"
      />
    </div>
  </button>
</template>

<style scoped lang="less"></style>
