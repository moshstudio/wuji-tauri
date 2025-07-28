<script setup lang="ts">
import { useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { useAttrs } from 'vue';

const attrs = useAttrs();

const displayStore = useDisplayStore();
const { isAppView } = storeToRefs(displayStore);
</script>

<template>
  <div class="h-full w-full overflow-hidden">
    <template v-if="isAppView">
      <slot name="app" v-bind="attrs"></slot>
    </template>
    <template v-else>
      <slot name="desktop" v-bind="attrs"></slot>
    </template>
    <slot></slot>
  </div>
</template>

<style scoped lang="less"></style>
