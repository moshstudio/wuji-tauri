<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { h, nextTick, onMounted, ref } from 'vue';
import PlatformSwitch from './components/PlatformSwitch.vue';
import View from './components/View.vue';
import MobileApp from './MobileApp.vue';
import { router } from './router';
import { useDisplayStore } from './store';
import { checkAndUpdate } from './utils/update';
import WinApp from './WinApp.vue';

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
    :class="isMobileView ? 'hide-vertical-scrollbar' : 'not-mobile-scrollbar'"
  >
    <PlatformSwitch>
      <template #mobile>
        <MobileApp :router-view="routerView" />
      </template>
      <template #windows>
        <WinApp :router-view="routerView" />
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

.hide-vertical-scrollbar {
  ::-webkit-scrollbar {
    background-color: transparent;
    width: 0; /* 隐藏纵向滚动条 */
    height: 8px; /* 保留横向滚动条高度 */
  }

  /* 横向滚动条相关样式 */
  ::-webkit-scrollbar-thumb:horizontal {
    background-color: rgba(110, 110, 110, 0.2);
    border-radius: 6px;
  }

  :hover::-webkit-scrollbar-thumb:horizontal {
    background-color: rgba(110, 110, 110, 0.6);
  }

  ::-webkit-scrollbar-thumb:horizontal:hover {
    background-color: rgba(110, 110, 110, 0.8);
  }
}
</style>
