<script setup lang="ts">
import { SyncOption } from '@/types/sync';
import { bytesToSize } from '@/utils';
import { ref } from 'vue';

const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
defineProps<{
  onDownload: () => Promise<void>;
}>();

const syncMode = ref<'overwrite' | 'incremental'>('incremental');
const showSyncModeSheet = ref(false);

const syncModeActions = [
  {
    name: '覆盖模式',
    subname: '下载的数据会完全覆盖本地已有数据',
    value: 'overwrite',
  },
  {
    name: '增量模式',
    subname: '下载的数据会与本地数据合并，保留本地已有数据',
    value: 'incremental',
  },
];

const onSelectSyncMode = (action: any) => {
  syncMode.value = action.value;
  showSyncModeSheet.value = false;
  const isIncremental = action.value === 'incremental';
  syncOptions.value.forEach((option) => {
    option.isIncremental = isIncremental;
  });
};

const getSyncModeText = () => {
  return syncMode.value === 'overwrite' ? '覆盖模式' : '增量模式';
};
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

      <van-cell-group inset class="mt-4 flex-shrink-0">
        <van-cell
          title="同步模式"
          :value="getSyncModeText()"
          is-link
          clickable
          @click="showSyncModeSheet = true"
        />
      </van-cell-group>

      <van-button class="m-4 flex-shrink-0" type="primary" @click="onDownload">
        从服务器下载
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
