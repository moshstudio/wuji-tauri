<script setup lang="ts">
import { useBackStore } from '@/store/backStore';

withDefaults(
  defineProps<{
    title?: string;
    rightText?: string;
    clickLeft?: () => void;
    clickRight?: () => void;
  }>(),
  {
    clickLeft: () => {
      const backStore = useBackStore();
      backStore.back();
    },
  },
);
</script>

<template>
  <van-nav-bar
    :title="title"
    left-arrow
    :right-text="rightText"
    @click-left="() => clickLeft()"
    @click-right="() => clickRight?.()"
  >
    <template v-if="Object.keys($slots).includes('title')" #title>
      <slot name="title" />
    </template>
    <template v-if="Object.keys($slots).includes('left')" #left>
      <slot name="left" />
    </template>
    <template v-if="Object.keys($slots).includes('right')" #right>
      <slot name="right" />
    </template>
  </van-nav-bar>
</template>

<style scoped lang="less"></style>
