<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { allowMultipleToast } from 'vant';
import { nextTick, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplayStore, useStore } from '@/store';
import { useBackStore } from '@/store/backStore';
import { checkAndUpdate } from '@/utils/update';
import RouterView from '@/views/tabbar/RouterView.vue';
import { router } from './router';

allowMultipleToast();

useStore();
useBackStore();
const displayStore = useDisplayStore();
const { isAppView, isDark } = storeToRefs(displayStore);
const route = useRoute();

onMounted(async () => {
  // 初始化路径
  await nextTick();
  await router.replace(displayStore.routerCurrPath);
});

onMounted(async () => {
  await nextTick();
  try {
    await checkAndUpdate();
  } catch (error) {
    console.warn('checkAndUpdate error', error);
  }
});
watch(
  [() => route.path, isAppView],
  async ([newPath, _]) => {
    if (isAppView.value && newPath.startsWith('/home')) {
      // app界面没有home
      router.push({ name: 'Photo' });
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
    <RouterView />
  </van-config-provider>
</template>

<style scoped lang="less"></style>
