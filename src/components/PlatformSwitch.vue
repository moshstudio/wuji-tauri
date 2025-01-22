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
    <slot name="windows" v-bind="attrs"></slot>
  </template>
  <template v-else>
    <slot name="mobile" v-bind="attrs"></slot>
  </template>
</template>

<style scoped lang="less"></style>
