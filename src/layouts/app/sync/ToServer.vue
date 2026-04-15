<script setup lang="ts">
import type { SyncOption } from '@/types/sync';
import { ref } from 'vue';
import { bytesToSize } from '@/utils';

defineProps<{
  onSync: () => Promise<void>;
}>();
const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
const syncMode = ref<'overwrite' | 'incremental'>('incremental');
const showSyncModeSheet = ref(false);

const syncModeActions = [
  {
    name: '覆盖模式',
    subname: '上传的数据会完全覆盖服务器已有数据',
    value: 'overwrite',
  },
  {
    name: '增量模式',
    subname: '上传的数据会与服务器数据合并，保留服务器已有数据',
    value: 'incremental',
  },
];

function onSelectSyncMode(action: any) {
  syncMode.value = action.value;
  showSyncModeSheet.value = false;
  const isIncremental = action.value === 'incremental';
  syncOptions.value.forEach((option) => {
    option.isIncremental = isIncremental;
  });
}

function getSyncModeText() {
  return syncMode.value === 'overwrite' ? '覆盖模式' : '增量模式';
}
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
            <van-switch
              v-model="option.sync"
              size="18"
              @click.stop
            />
          </template>
          <template #label>
            <div v-if="option.size !== undefined">
              {{ bytesToSize(option.size) }}
            </div>
            <van-loading v-else size="14" />
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="mt-4 flex-shrink-0">
        <van-cell
          title="同步模式"
          :value="getSyncModeText()"
          is-link
          clickable
          @click="showSyncModeSheet = true"
        />
      </van-cell-group>

      <van-button class="m-4 flex-shrink-0" type="primary" @click="onSync">
        同步至服务器
      </van-button>
    </main>

    <van-action-sheet
      v-model:show="showSyncModeSheet"
      :actions="syncModeActions"
      cancel-text="取消"
      close-on-click-action
      @select="onSelectSyncMode"
    />
  </div>
</template>

<style scoped lang="less"></style>
