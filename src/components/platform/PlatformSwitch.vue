<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAttrs } from 'vue';
import { useDisplayStore } from '@/store';

const attrs = useAttrs();

const displayStore = useDisplayStore();
const { isAppView } = storeToRefs(displayStore);
</script>

<template>
  <div class="h-full w-full overflow-hidden">
    <template v-if="isAppView">
      <slot name="app" v-bind="attrs" />
    </template>
    <template v-else>
      <slot name="desktop" v-bind="attrs" />
    </template>
    <slot />
  </div>
</template>

<style scoped lang="less"></style>
