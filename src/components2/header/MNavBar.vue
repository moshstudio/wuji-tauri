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
    <template #title v-if="Object.keys($slots).includes('title')">
      <slot name="title"></slot>
    </template>
    <template #left v-if="Object.keys($slots).includes('left')">
      <slot name="left"></slot>
    </template>
    <template #right v-if="Object.keys($slots).includes('right')">
      <slot name="right"></slot>
    </template>
  </van-nav-bar>
</template>

<style scoped lang="less"></style>
