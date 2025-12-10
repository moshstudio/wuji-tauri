<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import { storeToRefs } from 'pinia';
import { showConfirmDialog, showToast } from 'vant';
import { computed, onActivated, onMounted, ref, watch } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppMySourceEdit from '@/layouts/app/source/MySourceEdit.vue';
import DesktopMySourceEdit from '@/layouts/desktop/source/MySourceEdit.vue';
import { router } from '@/router';
import { useBackStore, useServerStore } from '@/store';
import { onMountedOrActivated } from '@vant/use';

const props = defineProps<{
  sourceId?: string;
}>();

const backStore = useBackStore();
const serverStore = useServerStore();

const { myMarketSources } = storeToRefs(serverStore);

const currentSource = ref<MarketSource>();

function clickSourceContent(
  source: MarketSource,
  sourceContent: MarketSourceContent,
) {
  router.push({
    name: 'SourceContentEdit',
    params: { sourceId: source._id, sourceContentId: sourceContent._id },
  });
}
function deleteSourceContent(
  source: MarketSource,
  sourceContent: MarketSourceContent,
) {
  showConfirmDialog({
    title: '删除',
    message: `确定要删除 ${sourceContent.name} 吗？`,
    confirmButtonText: '确定',
    cancelButtonText: '取消',
  }).then(async (confirm) => {
    if (confirm === 'confirm') {
      await serverStore.deleteMarketSourceContent(source, sourceContent);
      currentSource.value = myMarketSources.value.find(
        (item) => item._id === props.sourceId,
      );
      if (!currentSource.value) {
        backStore.back().then(() => {
          showToast('未找到该资源');
        });
      }
    }
  });
}

async function save(source: MarketSource) {
  await serverStore.updateMarketSource(source);
}

onMountedOrActivated(async () => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
  } else {
    currentSource.value = myMarketSources.value.find(
      (item) => item._id === props.sourceId,
    );
    if (!currentSource.value) {
      backStore.back().then(() => {
        showToast('未找到该资源');
      });
    }
  }
});
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppMySourceEdit
        :source="currentSource"
        :save="save"
        :click-source-content="clickSourceContent"
        :delete-source-content="deleteSourceContent"
      />
    </template>
    <template #desktop>
      <DesktopMySourceEdit
        :source="currentSource"
        :save="save"
        :click-source-content="clickSourceContent"
        :delete-source-content="deleteSourceContent"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
