<script setup lang="ts">
import {
  useBackStore,
  useServerStore,
  useStore,
  useSubscribeSourceStore,
} from '@/store';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppMySourceEdit from '@/layouts/app/source/MySourceEdit.vue';
import DesktopMySourceEdit from '@/layouts/desktop/source/MySourceEdit.vue';
import { computed, onActivated, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  MarketSource,
  MarketSourceContent,
  MarketSourcePermission,
} from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { router } from '@/router';
import { showConfirmDialog, showToast } from 'vant';

const props = defineProps<{
  sourceId?: string;
}>();

const backStore = useBackStore();
const serverStore = useServerStore();

const { myMarketSources } = storeToRefs(serverStore);

const source = computed(() => {
  return myMarketSources.value.find((item) => item._id === props.sourceId);
});

const clickSourceContent = (
  source: MarketSource,
  sourceContent: MarketSourceContent,
) => {
  router.push({
    name: 'SourceContentEdit',
    params: { sourceId: source._id, sourceContentId: sourceContent._id },
  });
};
const deleteSourceContent = (
  source: MarketSource,
  sourceContent: MarketSourceContent,
) => {
  showConfirmDialog({
    title: '删除',
    message: `确定要删除 ${sourceContent.name} 吗？`,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async (confirm) => {
    if (confirm === 'confirm') {
      await serverStore.deleteMarketSourceContent(source, sourceContent);
    }
  });
};

const save = async (source: MarketSource) => {
  await serverStore.updateMarketSource(source);
};

onMounted(() => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
    return;
  }
});
onActivated(() => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
    return;
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppMySourceEdit
        :source="source"
        :save="save"
        :click-source-content="clickSourceContent"
        :delete-source-content="deleteSourceContent"
      ></AppMySourceEdit>
    </template>
    <template #desktop>
      <DesktopMySourceEdit
        :source="source"
        :save="save"
        :click-source-content="clickSourceContent"
        :delete-source-content="deleteSourceContent"
      ></DesktopMySourceEdit>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
