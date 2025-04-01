<script setup lang="ts">
import { useDisplayStore, useSongStore } from './store';
import WinApp from './WinApp.vue';
import MobileApp from './MobileApp.vue';
import { storeToRefs } from 'pinia';
import { h, nextTick, onBeforeMount, onMounted, ref } from 'vue';
import { router } from './router';
import PlatformSwitch from './components/PlatformSwitch.vue';
import View from './components/View.vue';
import { checkAndUpdate } from './utils/update';

const displayStore = useDisplayStore();
const { isMobileView, isDark } = storeToRefs(displayStore);

onMounted(() => {
  // 初始化路径
  nextTick(async () => {
    console.log('routerCurrPath', displayStore.routerCurrPath);

    router.replace(displayStore.routerCurrPath);
  });
});

onMounted(async () => {
  if (!displayStore.isAndroid) {
    await checkAndUpdate();
  }
  // forwardConsoleLog();
  // // 启用 TargetKind::Webview 后，这个函数将把日志打印到浏览器控制台
  // const detach = await attachConsole();
  // // 将浏览器控制台与日志流分离
  // detach();
});

// 使用 render 函数生成 <router-view> 结构
const routerView = ref(h(View));
</script>

<template>
  <van-config-provider
    :theme="isDark ? 'dark' : 'light'"
    :class="isMobileView ? 'mobile-scrollbar' : 'not-mobile-scrollbar'"
  >
    <PlatformSwitch>
      <template #mobile>
        <MobileApp :routerView="routerView"></MobileApp>
      </template>
      <template #windows>
        <WinApp :routerView="routerView"></WinApp>
      </template>
    </PlatformSwitch>
  </van-config-provider>
</template>

<style scoped lang="less">
.not-mobile-scrollbar {
  ::-webkit-scrollbar {
    background-color: transparent;
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 6px;
  }
  :hover::-webkit-scrollbar-thumb {
    background-color: rgba(110, 110, 110, 0.2);
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(110, 110, 110, 0.6);
  }
}
.mobile-scrollbar {
  ::-webkit-scrollbar {
    background-color: transparent;
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-thumb {
    background-color: rgba(110, 110, 110, 0.2);
    border-radius: 6px;
  }
  :hover::-webkit-scrollbar-thumb {
    background-color: rgba(110, 110, 110, 0.6);
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: rgba(110, 110, 110, 0.8);
  }
}
</style>
