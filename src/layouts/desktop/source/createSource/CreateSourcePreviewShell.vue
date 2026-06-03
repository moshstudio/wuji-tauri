<script setup lang="ts">
import { CreateSourceRunStatus } from './useCreateSourceListRunner';

defineProps<{
  runStatus: CreateSourceRunStatus;
  errorMessage?: string;
}>();
</script>

<template>
  <div class="create-source-preview flex h-full min-h-0 w-full flex-col">
    <div
      v-if="runStatus === CreateSourceRunStatus.not_running"
      class="flex flex-1 items-center justify-center text-sm text-[var(--van-text-color-2)]"
    >
      未运行
    </div>
    <div
      v-else-if="runStatus === CreateSourceRunStatus.running"
      class="flex flex-1 items-center justify-center"
    >
      <van-loading />
    </div>
    <div
      v-else-if="runStatus === CreateSourceRunStatus.error"
      class="flex-1 overflow-auto p-2 text-sm text-red-500"
    >
      {{ errorMessage }}
    </div>
    <div
      v-else
      class="create-source-preview__body min-h-0 flex-1 overflow-auto"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped lang="less">
.create-source-preview__body {
  background: var(--van-background-2);
}
</style>
