<script setup lang="ts">
import MNavBar from './MNavBar.vue';
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
  <MNavBar
    :title="title"
    :right-text="rightText"
    :click-left="() => clickLeft()"
    :click-right="() => clickRight?.()"
  >
    <template v-if="$slots.title" #title>
      <slot name="title" />
    </template>
    <template v-if="$slots.left" #right>
      <slot name="right" />
    </template>
    <template v-if="$slots.right" #left>
      <slot name="left" />
    </template>
  </MNavBar>
</template>

<style scoped lang="less"></style>
