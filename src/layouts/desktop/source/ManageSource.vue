<script setup lang="ts">
import type { SubscribeItem, SubscribeSource } from '@/types';
import AppManageSource from '@/layouts/app/source/ManageSource.vue';

withDefaults(
  defineProps<{
    sources: SubscribeSource[];

    sourceDisabled: (source: SubscribeSource) => boolean;
    enableSource: (source: SubscribeSource, enable: boolean) => void;
    enableItem: (
      source: SubscribeSource,
      item: SubscribeItem,
      enable: boolean,
    ) => void;
    importSource: () => void;
    updateSources: (source?: SubscribeSource) => void;
    removeSource: (source: SubscribeSource) => void;
    isLocalSource: (source: SubscribeSource) => boolean;
    updateItem: (source: SubscribeSource, item: SubscribeItem) => void;
    removeItem: (source: SubscribeSource, item: SubscribeItem) => void;
  }>(),
  {},
);
</script>

<template>
  <AppManageSource
    :sources="sources"
    :source-disabled="sourceDisabled"
    :enable-source="enableSource"
    :enable-item="enableItem"
    :import-source="importSource"
    :update-sources="updateSources"
    :remove-source="removeSource"
    :update-item="updateItem"
    :remove-item="removeItem"
    :is-local-source="isLocalSource"
  />
</template>

<style scoped lang="less"></style>
