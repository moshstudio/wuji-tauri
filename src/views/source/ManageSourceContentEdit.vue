<script setup lang="ts">
import type { SubscribeSource } from '@wuji-tauri/source-extension';
import { computed } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppManageSourceContentEdit from '@/layouts/app/source/ManageSourceContentEdit.vue';
import DesktopManageSourceContentEdit from '@/layouts/desktop/source/ManageSourceContentEdit.vue';
import { useSubscribeSourceStore } from '@/store';

const props = defineProps<{
  sourceId?: string;
  sourceContentId?: string;
}>();

const subscribeStore = useSubscribeSourceStore();

const subscribeSource = computed(() => {
  return subscribeStore.subscribeSources.find(
    item => item.detail.id === props.sourceId,
  );
});
const sourceContent = computed(() => {
  return subscribeSource.value?.detail.urls?.find(
    item => item.id === props.sourceContentId,
  );
});

async function save(
  source: SubscribeSource,
  sourceContent: {
    id: string;
    name?: string;
    code?: string;
  },
) {
  const item = await subscribeStore.updateSubscribeSourceContent(
    source,
    sourceContent,
  );
  if (item) {
    await subscribeStore.loadSubscribeSources();
  }
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppManageSourceContentEdit
        :source="subscribeSource"
        :source-content="sourceContent"
        :save="save"
      />
    </template>
    <template #desktop>
      <DesktopManageSourceContentEdit
        :source="subscribeSource"
        :source-content="sourceContent"
        :save="save"
      />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
