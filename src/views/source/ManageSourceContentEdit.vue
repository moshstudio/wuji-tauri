<script setup lang="ts">
import { useStore, useSubscribeSourceStore } from '@/store';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppManageSourceContentEdit from '@/layouts/app/source/ManageSourceContentEdit.vue';
import DesktopManageSourceContentEdit from '@/layouts/desktop/source/ManageSourceContentEdit.vue';
import { computed } from 'vue';
import { SubscribeSource } from '@wuji-tauri/source-extension';
import _ from 'lodash';

const props = defineProps<{
  sourceId?: string;
  sourceContentId?: string;
}>();

const store = useStore();
const subscribeStore = useSubscribeSourceStore();

const subscribeSource = computed(() => {
  return subscribeStore.subscribeSources.find(
    (item) => item.detail.id === props.sourceId,
  );
});
const sourceContent = computed(() => {
  return subscribeSource.value?.detail.urls?.find(
    (item) => item.id === props.sourceContentId,
  );
});

const save = async (
  source: SubscribeSource,
  sourceContent: {
    id: string;
    name?: string;
    code?: string;
  },
) => {
  const item = await subscribeStore.updateSubscribeSourceContent(
    source,
    sourceContent,
  );
  if (item) {
    const found = store.getSource(item);
    if (found) {
      found.item = item;
    }
  }
};
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppManageSourceContentEdit
        :source="subscribeSource"
        :source-content="sourceContent"
        :save="save"
      ></AppManageSourceContentEdit>
    </template>
    <template #desktop>
      <DesktopManageSourceContentEdit
        :source="subscribeSource"
        :source-content="sourceContent"
        :save="save"
      ></DesktopManageSourceContentEdit>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
