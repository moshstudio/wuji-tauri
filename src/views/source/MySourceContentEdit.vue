<script setup lang="ts">
import type {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import { storeToRefs } from 'pinia';
import { showToast } from 'vant';
import { computed, onActivated, onMounted, watch } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppMySourceContentEdit from '@/layouts/app/source/MySourceContentEdit.vue';
import DesktopMySourceContentEdit from '@/layouts/desktop/source/MySourceContentEdit.vue';
import { useBackStore, useServerStore } from '@/store';

const props = defineProps<{
  sourceId?: string;
  sourceContentId?: string;
}>();

const backStore = useBackStore();
const serverStore = useServerStore();

const { myMarketSources } = storeToRefs(serverStore);

const source = computed(() => {
  return myMarketSources.value.find((item) => item._id === props.sourceId);
});
const sourceContent = computed(() => {
  return source.value?.sourceContents?.find(
    (item) => item._id === props.sourceContentId,
  );
});

async function save(source: MarketSource, sourceContent: MarketSourceContent) {
  await serverStore.updateMarketSourceContent(source, sourceContent);
}

onMounted(() => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
  }
});
onActivated(() => {
  if (!serverStore.userInfo) {
    backStore.back().then(() => {
      showToast('请先登录');
    });
  }
});
watch(
  sourceContent,
  (sourceContent) => {
    console.log(sourceContent);

    if (!sourceContent) {
      backStore.back();
    }
  },
  { once: true },
);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppMySourceContentEdit
        :source="source"
        :source-content="sourceContent"
        :save="save"
      />
    </template>
    <template #desktop>
      <DesktopMySourceContentEdit
        :source="source"
        :source-content="sourceContent"
        :save="save"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
