<script setup lang="ts">
import type { ActionSheetAction } from 'vant';

const { actions } = defineProps<{
  actions: ActionSheetAction[];
}>();
const show = defineModel<boolean>();
</script>

<template>
  <van-action-sheet
    v-model:show="show"
    :actions="actions"
    cancel-text="取消"
    title="更多选项"
    teleport="body"
  />
</template>

<style scoped lang="less"></style>
