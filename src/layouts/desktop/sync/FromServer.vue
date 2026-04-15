<script setup lang="ts">
import type { SyncOption } from '@/types/sync';
import AppFromServer from '@/layouts/app/sync/FromServer.vue';

defineProps<{
  onDownload: () => Promise<void>;
}>();
const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
</script>

<template>
  <AppFromServer :sync-options="syncOptions" :on-download="onDownload" />
</template>

<style scoped lang="less"></style>
