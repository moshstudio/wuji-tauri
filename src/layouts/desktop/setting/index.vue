<script setup lang="ts">
import AppSetting from '@/layouts/app/setting/index.vue';

defineProps<{
  clearCache: () => void;
  clearData: () => void;
}>();
const isDark = defineModel<boolean>('isDark', { required: true });
const songAutoSwitchSource = defineModel<boolean>('songAutoSwitchSource', {
  required: true,
});
</script>

<template>
  <AppSetting
    v-model:is-dark="isDark"
    v-model:song-auto-switch-source="songAutoSwitchSource"
    :clear-cache="clearCache"
    :clear-data="clearData"
  ></AppSetting>
</template>

<style scoped lang="less"></style>
