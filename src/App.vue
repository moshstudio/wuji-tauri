<script setup lang="ts">
import { useDisplayStore } from './store';
import WinApp from './WinApp.vue';
import MobileApp from './MobileApp.vue';
import { storeToRefs } from 'pinia';

const displayStore = useDisplayStore();
const { isMobile } = storeToRefs(displayStore);
</script>

<template>
  <van-config-provider :theme="displayStore.isDark ? 'dark' : 'light'">
    <WinApp v-if="!isMobile"></WinApp>
    <MobileApp v-else></MobileApp>
  </van-config-provider>
</template>

<style scoped lang="less"></style>
