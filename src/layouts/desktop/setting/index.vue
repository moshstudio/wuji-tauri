<script setup lang="ts">
import AppSetting from '@/layouts/app/setting/index.vue';

defineProps<{
  clearCache: () => void;
  clearData: () => void;
}>();
const isDark = defineModel<boolean>('isDark', { required: true });
const showHistory = defineModel<boolean>('showHistory', { required: true });
const songAutoSwitchSource = defineModel<boolean>('songAutoSwitchSource', {
  required: true,
});
const autoUpdateSubscribeSource = defineModel<boolean>(
  'autoUpdateSubscribeSource',
  {
    required: true,
  },
);
const paginationPosition = defineModel<'top' | 'bottom' | 'both'>(
  'paginationPosition',
  {
    required: true,
  },
);
</script>

<template>
  <AppSetting
    v-model:is-dark="isDark"
    v-model:show-history="showHistory"
    v-model:song-auto-switch-source="songAutoSwitchSource"
    v-model:auto-update-subscribe-source="autoUpdateSubscribeSource"
    v-model:pagination-position="paginationPosition"
    :clear-cache="clearCache"
    :clear-data="clearData"
  ></AppSetting>
</template>

<style scoped lang="less"></style>
