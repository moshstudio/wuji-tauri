<script setup lang="ts">
import { SyncOption } from '@/types/sync';
import { bytesToSize } from '@/utils';

const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
defineProps<{
  onSync: () => Promise<void>;
}>();
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <MNavBar title="上传至服务器" />
    <main
      v-remember-scroll
      class="flex flex-grow flex-col overflow-y-auto bg-[--van-background] p-4"
    >
      <van-cell-group inset class="flex-shrink-0">
        <van-cell
          v-for="option in syncOptions"
          :key="option.name"
          clickable
          @click="() => (option.sync = !option.sync)"
        >
          <template #title>
            {{ option.name }}
          </template>
          <template #value>
            <van-switch size="18" v-model="option.sync"></van-switch>
          </template>
          <template #label>
            <div v-if="option.size !== undefined">
              {{ bytesToSize(option.size) }}
            </div>
            <van-loading size="14" v-else></van-loading>
          </template>
        </van-cell>
      </van-cell-group>
      <van-button class="m-4 flex-shrink-0" type="primary" @click="onSync">
        同步至服务器
      </van-button>
      <div class="flex flex-grow items-end justify-center">
        <p class="text-xs text-[var(--van-text-color-2)]">
          同步后会覆盖服务器已有数据
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped lang="less"></style>
