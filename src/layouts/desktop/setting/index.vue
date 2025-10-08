<script setup lang="ts">
import AppSetting from '@/layouts/app/setting/index.vue';

defineProps<{
  clearCache: () => void;
  clearData: () => void;
}>();
const isDark = defineModel<boolean>('isDark', { required: true });
</script>

<template>
  <AppSetting
    v-model:is-dark="isDark"
    :clear-cache="clearCache"
    :clear-data="clearData"
  ></AppSetting>
</template>

<style scoped lang="less"></style>
