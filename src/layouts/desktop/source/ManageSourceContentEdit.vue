<script setup lang="ts">
import type {
  SubscribeItem,
  SubscribeSource,
} from '@wuji-tauri/source-extension';
import AppManageSourceContentEdit from '@/layouts/app/source/ManageSourceContentEdit.vue';

const props = defineProps<{
  source?: SubscribeSource;
  sourceContent?: SubscribeItem;
  save: (
    source: SubscribeSource,
    sourceContent: {
      id: string;
      name?: string;
      code?: string;
    },
  ) => void;
}>();
</script>

<template>
  <AppManageSourceContentEdit
    :source="source"
    :source-content="sourceContent"
    :save="save"
  />
</template>

<style scoped lang="less"></style>
