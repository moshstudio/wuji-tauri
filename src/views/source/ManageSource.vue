<script setup lang="ts">
import type {
  SubscribeItem,
  SubscribeSource,
} from '@wuji-tauri/source-extension';
import { showConfirmDialog, showNotify, showSuccessToast, showToast } from 'vant';
import { onDeactivated, ref } from 'vue';
import ImportSubscribeSource from '@/components/dialog/ImportSubscribeSource.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppManageSource from '@/layouts/app/source/ManageSource.vue';
import DesktopManageSource from '@/layouts/desktop/source/ManageSource.vue';
import { router } from '@/router';
import { useStore, useSubscribeSourceStore } from '@/store';
import { sleep } from '@/utils';

const store = useStore();
const sourceStore = useSubscribeSourceStore();

const showImportSubscribeDialog = ref(false);

function syncSubscribeSources() {
  // 仅同步启用状态到运行时，不拉取推荐；列表页首次进入/返回时再加载
  store.loadSubscribeSources();
}

function sourceDisabled(source: SubscribeSource) {
  return source.detail?.urls.every(url => url.disable === true) || false;
}
function enableSource(source: SubscribeSource, enable: boolean) {
  // van-switch 的 enable 语义：true=开启；此处入参沿用原逻辑（enable 为 true 时表示「切换后应为禁用」来自旧 UI）
  sourceStore.setSourceDisabled(source, enable);
  syncSubscribeSources();
}

function enableAllSources() {
  const { changed, skippedExclusive } = sourceStore.setAllSourcesDisabled(false);
  if (skippedExclusive) {
    showNotify({
      type: 'warning',
      message: changed
        ? `已启用 ${changed} 个订阅源，${skippedExclusive} 个专属源需开通会员`
        : `${skippedExclusive} 个专属源需开通会员后才能启用`,
      duration: 3000,
    });
    return;
  }
  if (changed)
    showSuccessToast('已全部启用');
  else
    showToast('当前已全部启用');
}

function disableAllSources() {
  const { changed } = sourceStore.setAllSourcesDisabled(true);
  if (changed)
    showSuccessToast('已全部禁用');
  else
    showToast('当前已全部禁用');
}
function enableItem(
  source: SubscribeSource,
  item: SubscribeItem,
  enable: boolean,
) {
  sourceStore.setSubscribeItemDisabled(source, item, enable);
  syncSubscribeSources();
}

function importSource() {
  showImportSubscribeDialog.value = true;
}

async function updateSources(source?: SubscribeSource) {
  await store.updateSubscribeSources(source);
}
function removeSource(source: SubscribeSource) {
  showConfirmDialog({
    title: '删除订阅源',
    message: `确定要删除订阅源 "${source.detail.name}" 吗？`,
  }).then(async (confirm) => {
    if (confirm === 'confirm') {
      sourceStore.removeSubscribeSource(source);
    }
  }).catch(() => {});
}
function removeItem(source: SubscribeSource, item: SubscribeItem) {
  showConfirmDialog({
    title: '删除订阅项',
    message: `确定要删除订阅项 "${item.name}" 吗？`,
  }).then(async (confirm) => {
    if (confirm === 'confirm') {
      sourceStore.removeItemFromSubscribeSource(item.id, source.detail.id);
    }
  }).catch(() => {});
}

function updateItem(source: SubscribeSource, item: SubscribeItem) {
  router.push({
    name: 'SourceManageContentEdit',
    params: {
      sourceId: source.detail.id,
      sourceContentId: item.id,
    },
  });
}

function isLocalSource(source: SubscribeSource) {
  return source.detail.id === store.localSourceId;
}

onDeactivated(async () => {
  await sleep(500);
  store.loadSubscribeSources();
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppManageSource
        :sources="sourceStore.subscribeSources"
        :source-disabled="sourceDisabled"
        :enable-source="enableSource"
        :enable-all-sources="enableAllSources"
        :disable-all-sources="disableAllSources"
        :enable-item="enableItem"
        :import-source="importSource"
        :update-sources="updateSources"
        :remove-source="removeSource"
        :update-item="updateItem"
        :remove-item="removeItem"
        :is-local-source="isLocalSource"
      />
    </template>
    <template #desktop>
      <DesktopManageSource
        :sources="sourceStore.subscribeSources"
        :source-disabled="sourceDisabled"
        :enable-source="enableSource"
        :enable-all-sources="enableAllSources"
        :disable-all-sources="disableAllSources"
        :enable-item="enableItem"
        :import-source="importSource"
        :update-sources="updateSources"
        :remove-source="removeSource"
        :update-item="updateItem"
        :remove-item="removeItem"
        :is-local-source="isLocalSource"
      />
    </template>
    <ImportSubscribeSource v-model:show="showImportSubscribeDialog" />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
