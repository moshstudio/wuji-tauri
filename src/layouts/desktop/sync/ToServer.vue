<script setup lang="ts">
import AppToServer from '@/layouts/app/sync/ToServer.vue';
import { SyncOption } from '@/types/sync';
const syncOptions = defineModel<SyncOption[]>('syncOptions', {
  required: true,
});
defineProps<{
  onSync: () => Promise<void>;
}>();
</script>

<template>
  <AppToServer v-bind:sync-options="syncOptions" :onSync="onSync" />
</template>

<style scoped lang="less"></style>
