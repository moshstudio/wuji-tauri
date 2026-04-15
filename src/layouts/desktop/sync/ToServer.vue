<script setup lang="ts">
import type { SyncOption } from '@/types/sync';
import AppToServer from '@/layouts/app/sync/ToServer.vue';

defineProps<{
  onSync: () => Promise<void>;
}>();
const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
</script>

<template>
  <AppToServer :sync-options="syncOptions" :on-sync="onSync" />
</template>

<style scoped lang="less"></style>
