<script setup lang="ts">
import { useStore, useSubscribeSourceStore } from '@/store';
import { showConfirmDialog } from 'vant';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppManageSource from '@/layouts/app/source/ManageSource.vue';
import DesktopManageSource from '@/layouts/desktop/source/ManageSource.vue';
import ImportSubscribeSource from '@/components/dialog/ImportSubscribeSource.vue';
import { SubscribeItem, SubscribeSource } from '@wuji-tauri/source-extension';
import { sleep } from '@/utils';
import { onDeactivated, ref } from 'vue';
import { router } from '@/router';

const store = useStore();
const sourceStore = useSubscribeSourceStore();

const showImportSubscribeDialog = ref(false);

function sourceDisabled(source: SubscribeSource) {
  return source.detail?.urls.every((url) => url.disable === true) || false;
}
function enableSource(source: SubscribeSource, enable: boolean) {
  if (enable) {
    // 禁用此source
    source.detail?.urls.forEach((url) => {
      url.disable = true;
    });
  } else {
    // 启用此source
    source.detail?.urls.forEach((url) => {
      url.disable = false;
    });
  }
  save();
}
function enableItem(
  source: SubscribeSource,
  item: SubscribeItem,
  enable: boolean,
) {
  if (enable) {
    // 禁用此url
    item.disable = true;
    if (source.detail?.urls.every((url) => url.disable)) {
      source.disable = true;
    }
  } else {
    // 启用此url
    item.disable = false;
    source.disable = false;
  }
  save();
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
    if (confirm) {
      sourceStore.removeSubscribeSource(source);
    }
  });
}
function removeItem(source: SubscribeSource, item: SubscribeItem) {
  showConfirmDialog({
    title: '删除订阅项',
    message: `确定要删除订阅项 "${item.name}" 吗？`,
  }).then(async (confirm) => {
    if (confirm) {
      sourceStore.removeItemFromSubscribeSource(item.id, source.detail.id);
    }
  });
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

function save() {
  sourceStore.saveSubscribeSources();
}

onDeactivated(async () => {
  await sleep(500);
  store.loadSubscribeSources(true, 200);
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppManageSource
        :sources="sourceStore.subscribeSources"
        :source-disabled="sourceDisabled"
        :enable-source="enableSource"
        :enable-item="enableItem"
        :import-source="importSource"
        :update-sources="updateSources"
        :remove-source="removeSource"
        :update-item="updateItem"
        :remove-item="removeItem"
        :is-local-source="isLocalSource"
      ></AppManageSource>
    </template>
    <template #desktop>
      <DesktopManageSource
        :sources="sourceStore.subscribeSources"
        :source-disabled="sourceDisabled"
        :enable-source="enableSource"
        :enable-item="enableItem"
        :import-source="importSource"
        :update-sources="updateSources"
        :remove-source="removeSource"
        :update-item="updateItem"
        :remove-item="removeItem"
        :is-local-source="isLocalSource"
      ></DesktopManageSource>
    </template>
    <ImportSubscribeSource v-model:show="showImportSubscribeDialog" />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
