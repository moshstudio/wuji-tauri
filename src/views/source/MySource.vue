<script setup lang="ts">
import type {
  MarketSource,
  MarketSourcePermission,
} from '@wuji-tauri/source-extension';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import { storeToRefs } from 'pinia';
import { showConfirmDialog, showToast } from 'vant';
import { computed, onActivated, onMounted, ref } from 'vue';
import MarketSourceCreateDialog from '@/components/dialog/MarketSourceCreate.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppMySource from '@/layouts/app/source/MySource.vue';
import DesktopMySource from '@/layouts/desktop/source/MySource.vue';
import { router } from '@/router';
import {
  useBackStore,
  useServerStore,
  useStore,
  useSubscribeSourceStore,
} from '@/store';
import { permissionStyle, permissionText } from '@/utils/marketSource';

const backStore = useBackStore();
const store = useStore();
const subscribeStore = useSubscribeSourceStore();
const serverStore = useServerStore();

const { myMarketSources } = storeToRefs(serverStore);

const isFreshing = ref(false);

const showCreateDialog = ref(false);

const showMoreOptions = ref(false);
const moreOptionSource = ref<MarketSource>();
function showMoreOptionsAction(source: MarketSource) {
  moreOptionSource.value = source;
  showMoreOptions.value = true;
}

const moreOptionActions = computed(() => {
  if (!moreOptionSource.value) {
    return [];
  }
  const isImported = !!subscribeStore.subscribeSources.find(
    (s) => s.detail.id === moreOptionSource.value?._id,
  );
  return [
    {
      name: isImported ? '已导入' : '导入',
      callback: async () => {
        if (!moreOptionSource.value) return;
        if (isImported) {
          router.push({ name: 'SourceManage' });
        } else {
          await store.addMarketSource(moreOptionSource.value);
        }
      },
    },
    {
      name: '编辑',
      callback: () => {
        router.push({
          name: 'SourceEdit',
          params: { sourceId: moreOptionSource.value?._id },
        });
      },
    },
    {
      name: '删除',
      color: '#E74C3C',
      callback: () => {
        showConfirmDialog({
          title: '删除订阅源',
          message: `确定要删除订阅源 "${moreOptionSource.value?.name}" 吗？`,
        }).then(async (confirm) => {
          if (confirm === 'confirm') {
            if (moreOptionSource.value) {
              serverStore.deleteMarketSource(moreOptionSource.value);
            }
          }
        });
      },
    },
    {
      name: '创建源',
      callback: () => {
        router.push({ name: 'SourceContentCreate' });
      },
    },
  ];
});

async function load() {
  isFreshing.value = true;
  await serverStore.getMyMarketSources();
  isFreshing.value = false;
}

async function createSourceAction(
  name: string,
  permissions: MarketSourcePermission[],
  isPublic: boolean,
) {
  await serverStore.createMarketSource({ name, permissions, isPublic });
}

function onClick(item: MarketSource) {
  moreOptionSource.value = item;
  router.push({
    name: 'SourceEdit',
    params: { sourceId: moreOptionSource.value._id },
  });
}

onMounted(() => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
    return;
  }
  load();
});

onActivated(() => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppMySource
        v-model:is-freshing="isFreshing"
        :sources="myMarketSources"
        :refresh="load"
        :permission-text="permissionText"
        :permission-style="permissionStyle"
        :create-source="() => (showCreateDialog = true)"
        :on-click="onClick"
        :show-more-options="showMoreOptionsAction"
      />
    </template>
    <template #desktop>
      <DesktopMySource
        v-model:is-freshing="isFreshing"
        :sources="myMarketSources"
        :refresh="load"
        :permission-text="permissionText"
        :permission-style="permissionStyle"
        :create-source="() => (showCreateDialog = true)"
        :on-click="onClick"
        :show-more-options="showMoreOptionsAction"
      />
    </template>
    <MoreOptionsSheet
      v-model="showMoreOptions"
      :title="moreOptionSource?.name"
      :actions="moreOptionActions"
    />
    <MarketSourceCreateDialog
      v-model:show="showCreateDialog"
      :create="createSourceAction"
    />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
