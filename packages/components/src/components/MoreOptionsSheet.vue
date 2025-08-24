<script setup lang="ts">
import type { ActionSheetAction } from 'vant';

const show = defineModel<boolean>();

withDefaults(
  defineProps<{
    actions: ActionSheetAction[];
    title?: string;
    closeOnClickAction?: boolean;
  }>(),
  {
    title: '更多选项',
    closeOnClickAction: true,
  },
);
</script>

<template>
  <van-action-sheet
    v-model:show="show"
    :actions="actions"
    cancel-text="取消"
    :title="title"
    teleport="body"
    :close-on-click-action="closeOnClickAction"
  />
</template>

<style scoped lang="less"></style>
