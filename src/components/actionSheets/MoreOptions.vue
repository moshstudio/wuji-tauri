<script setup lang="ts">
import { ActionSheetAction } from 'vant';
const show = defineModel<boolean>();
const { actions } = defineProps<{
  actions: ActionSheetAction[];
}>();
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
