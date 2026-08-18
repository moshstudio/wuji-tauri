<script setup lang="ts">
import type { SyncTypes } from '@/types/sync';
import { storeToRefs } from 'pinia';
import { showSuccessToast } from 'vant';
import MNavBar from '@/components/header/MNavBar.vue';
import { useCloudSyncScheduler, useCloudSyncSettings } from '@/store';
import { ALL_SYNC_TYPES, SYNC_TYPE_LABELS } from '@/types/sync';

const settings = useCloudSyncSettings();
const scheduler = useCloudSyncScheduler();
const { cloudSyncTypes, enableCloudSync } = storeToRefs(settings);
const { status } = storeToRefs(scheduler);

function isEnabled(type: SyncTypes) {
  return cloudSyncTypes.value?.[type] !== false;
}

function toggleType(type: SyncTypes, value: boolean) {
  settings.setTypeEnabled(type, value);
}

function enableAll() {
  settings.setAllTypes(true);
}

function disableAll() {
  settings.setAllTypes(false);
}

async function syncNow() {
  const ok = await scheduler.syncNow();
  if (ok)
    showSuccessToast('同步完成');
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="管理同步数据" />
    <div class="grow overflow-y-auto bg-[--van-background] p-2">
      <van-notice-bar
        v-if="!enableCloudSync"
        left-icon="info-o"
        text="总开关已关闭，开启后才会自动同步所选类型"
      />

      <van-cell-group inset class="mt-2">
        <van-cell title="同步全部类型">
          <template #right-icon>
            <div class="flex gap-2">
              <van-button size="mini" type="primary" plain @click="enableAll">
                全开
              </van-button>
              <van-button size="mini" plain @click="disableAll">
                全关
              </van-button>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset class="mt-4" title="数据类型">
        <van-cell
          v-for="type in ALL_SYNC_TYPES"
          :key="type"
          :title="SYNC_TYPE_LABELS[type]"
        >
          <template #right-icon>
            <van-switch
              :model-value="isEnabled(type)"
              size="20px"
              @update:model-value="(v: boolean) => toggleType(type, v)"
            />
          </template>
        </van-cell>
      </van-cell-group>

      <div class="p-4">
        <van-button
          block
          type="primary"
          :loading="status === 'syncing'"
          :disabled="!enableCloudSync"
          @click="syncNow"
        >
          立即同步
        </van-button>
        <p class="mt-2 text-center text-xs text-[--van-text-color-2]">
          关闭某类型后，该类型不再上传或下载；服务器上已有数据不会删除。
          本地变更会自动上传。
        </p>
      </div>
    </div>
  </div>
</template>
