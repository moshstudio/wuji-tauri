<script setup lang="ts">
import { useBackStore, useStore, useSubscribeSourceStore } from '@/store';
import { showConfirmDialog, showSuccessToast } from 'vant';
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import AppManageSource from '@/layouts/app/source/ManageSource.vue';
import DesktopManageSource from '@/layouts/desktop/source/ManageSource.vue';
import { SubscribeItem, SubscribeSource } from '@wuji-tauri/source-extension';
import { sleep } from '@/utils';
import { onDeactivated } from 'vue';

const store = useStore();
const backStore = useBackStore();
const sourceStore = useSubscribeSourceStore();

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

function isLocalSource(source: SubscribeSource) {
  return source.detail.id === store.localSourceId;
}

function save() {
  sourceStore.saveSubscribeSources();
}

onDeactivated(async () => {
  console.log('manage source onDeactivated');

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
        :remove-source="removeSource"
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
        :remove-source="removeSource"
        :remove-item="removeItem"
        :is-local-source="isLocalSource"
      ></DesktopManageSource>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
