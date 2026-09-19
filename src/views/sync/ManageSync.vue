<script setup lang="ts">
import type { SyncTypes } from '@/types/sync';
import { storeToRefs } from 'pinia';
import { showFailToast, showSuccessToast } from 'vant';
import MNavBar from '@/components/header/MNavBar.vue';
import { useCloudSyncScheduler, useCloudSyncSettings } from '@/store';
import { ALL_SYNC_TYPES, SYNC_TYPE_LABELS } from '@/types/sync';
import { showVipDialog } from '@/utils/vip';

const settings = useCloudSyncSettings();
const scheduler = useCloudSyncScheduler();
const { cloudSyncTypes, enableCloudSync } = storeToRefs(settings);
const { status, canUseSync } = storeToRefs(scheduler);

function isEnabled(type: SyncTypes) {
  return cloudSyncTypes.value?.[type] !== false;
}

function requireCloudSync(): boolean {
  if (canUseSync.value)
    return true;
  showVipDialog('数据同步为会员功能\n请先开通会员');
  return false;
}

function toggleType(type: SyncTypes, value: boolean) {
  if (!requireCloudSync())
    return;
  settings.setTypeEnabled(type, value);
}

function enableAll() {
  if (!requireCloudSync())
    return;
  settings.setAllTypes(true);
}

function disableAll() {
  if (!requireCloudSync())
    return;
  settings.setAllTypes(false);
}

async function syncNow() {
  if (!requireCloudSync())
    return;
  const ok = await scheduler.syncNow();
  if (ok)
    showSuccessToast('同步完成');
  else
    showFailToast(scheduler.statusDetail || '同步失败');
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="管理同步数据" />
    <div class="grow overflow-y-auto bg-[--van-background] p-2">
      <van-notice-bar
        v-if="!canUseSync"
        left-icon="info-o"
        text="云同步为会员功能，开通后可管理同步类型"
      />
      <van-notice-bar
        v-else-if="!enableCloudSync"
        left-icon="info-o"
        text="总开关已关闭，开启后才会自动同步所选类型"
      />

      <van-cell-group inset class="mt-2">
        <van-cell title="同步全部类型">
          <template #right-icon>
            <div class="flex gap-2">
              <van-button size="mini" type="primary" plain :disabled="!canUseSync" @click="enableAll">
                全开
              </van-button>
              <van-button size="mini" plain :disabled="!canUseSync" @click="disableAll">
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
              :disabled="!canUseSync"
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
          :disabled="!canUseSync || !enableCloudSync"
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
