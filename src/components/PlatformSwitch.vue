<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDisplayStore } from '@/store';
import { useAttrs } from 'vue';

const attrs = useAttrs();

const displayStore = useDisplayStore();
const { isMobile } = storeToRefs(displayStore);
</script>

<template>
  <template v-if="!isMobile">
    <keep-alive>
      <slot name="windows" v-bind="attrs"></slot>
    </keep-alive>
  </template>
  <template v-else>
    <keep-alive>
      <slot name="mobile" v-bind="attrs"></slot>
    </keep-alive>
  </template>
</template>

<style scoped lang="less"></style>
