<script setup lang="ts">
import AppFromServer from '@/layouts/app/sync/FromServer.vue';
import { SyncOption } from '@/types/sync';
const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
defineProps<{
  onDownload: () => Promise<void>;
}>();
</script>

<template>
  <AppFromServer v-bind:sync-options="syncOptions" :onDownload="onDownload" />
</template>

<style scoped lang="less"></style>
