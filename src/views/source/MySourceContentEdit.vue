<script setup lang="ts">
import { useBackStore, useServerStore } from '@/store';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppMySourceContentEdit from '@/layouts/app/source/MySourceContentEdit.vue';
import DesktopMySourceContentEdit from '@/layouts/desktop/source/MySourceContentEdit.vue';
import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  MarketSource,
  MarketSourceContent,
} from '@wuji-tauri/source-extension';
import _ from 'lodash';
import { showToast } from 'vant';

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

const save = async (
  source: MarketSource,
  sourceContent: MarketSourceContent,
) => {
  await serverStore.updateMarketSourceContent(source, sourceContent);
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
      <AppMySourceContentEdit
        :source="source"
        :source-content="sourceContent"
        :save="save"
      ></AppMySourceContentEdit>
    </template>
    <template #desktop>
      <DesktopMySourceContentEdit
        :source="source"
        :source-content="sourceContent"
        :save="save"
      ></DesktopMySourceContentEdit>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
