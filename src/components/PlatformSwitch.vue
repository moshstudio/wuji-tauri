<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDisplayStore } from '@/store';
import { computed, useAttrs } from 'vue';

const attrs = useAttrs();

const displayStore = useDisplayStore();
const { isMobileView } = storeToRefs(displayStore);
</script>

<template>
  <template v-if="isMobileView">
    <keep-alive>
      <slot name="mobile" v-bind="attrs"></slot>
    </keep-alive>
  </template>
  <template v-else>
    <keep-alive>
      <slot name="windows" v-bind="attrs"></slot>
    </keep-alive>
  </template>
</template>

<style scoped lang="less"></style>
