<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, watch } from 'vue';
import { useDisplayStore, useStore } from '@/store';
import { checkAndUpdate } from '@/utils/update';
import { useBackStore } from '@/store/backStore';
import { useRoute } from 'vue-router';
import { router } from './router';
import RouterView from '@/views/tabbar/RouterView.vue';
import { allowMultipleToast } from 'vant';

allowMultipleToast();

useStore();
useBackStore();
const displayStore = useDisplayStore();
const { isAppView, isDark } = storeToRefs(displayStore);
const route = useRoute();

onMounted(() => {
  // 初始化路径
  nextTick(async () => {
    router.replace(displayStore.routerCurrPath);
  });
});

onMounted(async () => {
  if (displayStore.isWindows) {
    try {
      await checkAndUpdate();
    } catch (error) {
      console.warn('checkAndUpdate error', error);
    }
  }
});
watch(
  [() => route.path, isAppView],
  async ([newPath, _]) => {
    if (isAppView.value && newPath.startsWith('/home')) {
      // app界面没有home
      router.push({ name: 'Photo' });
      return;
    }
  },
  { immediate: true },
);
</script>

<template>
  <van-config-provider
    :theme="isDark ? 'dark' : 'light'"
    class="h-full w-full overflow-hidden bg-[--van-background]"
    :class="isAppView ? 'hide-vertical-scrollbar' : 'not-mobile-scrollbar'"
  >
    <RouterView></RouterView>
    <!-- <router-view v-slot="{ Component }">
      <transition :name="'fade'">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view> -->
  </van-config-provider>
</template>

<style scoped lang="less"></style>
