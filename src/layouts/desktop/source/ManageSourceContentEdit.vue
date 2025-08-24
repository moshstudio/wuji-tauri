<script setup lang="ts">
import _ from 'lodash';
import { SubscribeItem, SubscribeSource } from '@wuji-tauri/source-extension';
import MNavBar from '@/components/header/MNavBar.vue';
import AppManageSourceContentEdit from '@/layouts/app/source/ManageSourceContentEdit.vue';
import IEditor from '@/components/codeEditor/IEditor.vue';

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
  ></AppManageSourceContentEdit>
</template>

<style scoped lang="less"></style>
