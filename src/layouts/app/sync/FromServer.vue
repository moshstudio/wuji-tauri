<script setup lang="ts">
import { SyncOption } from '@/types/sync';
import { bytesToSize } from '@/utils';

const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
defineProps<{
  onDownload: () => Promise<void>;
}>();
</script>

<template>
  <div class="relative flex h-full flex-col overflow-hidden">
    <MNavBar title="从服务器下载" />
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
            <van-switch
              size="18"
              v-model="option.sync"
              @click.stop
            ></van-switch>
          </template>
        </van-cell>
      </van-cell-group>
      <van-button class="m-4 flex-shrink-0" type="primary" @click="onDownload">
        从服务器下载
      </van-button>
      <div class="flex flex-grow items-end justify-center">
        <p class="text-xs text-[var(--van-text-color-2)]">
          同步后会覆盖当前数据
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped lang="less"></style>
