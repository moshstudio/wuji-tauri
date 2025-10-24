<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();

const shouldExclude = () => {
  // 如果当前路由的 meta.keepAlive 为 false，则排除
  if (route.meta?.keepAlive === false) {
    return [route.name!.toString()];
  } else {
    return [];
  }
};
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition :name="(route.meta.transition as string) || ''">
      <keep-alive :exclude="shouldExclude()">
        <component :is="Component" />
      </keep-alive>
    </transition>
  </router-view>
</template>

<style scoped lang="less">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
  position: absolute;
  width: 100%;
  height: 100%;
}

.fade-enter-from {
  opacity: 0;
}
.fade-enter-to {
  opacity: 1;
}
.fade-leave-from {
  opacity: 1;
}
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active,
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.5s ease;
  position: absolute;
  width: 100%;
  height: 100%;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.none-enter-active,
.none-leave-active {
  transition: none;
}

.none-enter-from,
.none-leave-to {
  opacity: 1;
  transform: none;
}
</style>
