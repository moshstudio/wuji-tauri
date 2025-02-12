<script setup lang="ts">
import { useDisplayStore } from './store';
import WinApp from './WinApp.vue';
import MobileApp from './MobileApp.vue';
import { storeToRefs } from 'pinia';
import { onBeforeMount, onMounted } from 'vue';
import { forwardConsoleLog } from './utils';
import { attachConsole } from '@tauri-apps/plugin-log';

const displayStore = useDisplayStore();
const { isMobile } = storeToRefs(displayStore);

onMounted(async () => {
  // forwardConsoleLog();
  // // 启用 TargetKind::Webview 后，这个函数将把日志打印到浏览器控制台
  // const detach = await attachConsole();
  // // 将浏览器控制台与日志流分离
  // detach();
});
</script>

<template>
  <van-config-provider :theme="displayStore.isDark ? 'dark' : 'light'">
    <WinApp v-if="!isMobile"></WinApp>
    <MobileApp v-else></MobileApp>
  </van-config-provider>
</template>

<style scoped lang="less"></style>
