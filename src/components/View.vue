<script setup lang="ts">
import { h, KeepAlive } from 'vue';

const wrapKeepAlive = (comp: any) => {
  console.log('comp is', comp);

  if (!comp) return comp;

  return {
    setup() {
      return () =>
        h(KeepAlive, null, {
          default: () => h(comp),
        });
    },
  };
};
</script>

<template>
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<style scoped lang="less">
/* 滑动效果 */
.slide-enter-active {
  transition: transform 0.15s ease-out;
  transition: opacity 0.15s ease-out;
}
.slide-leave-active {
  transition: transform 0.15s ease-in;
  transition: opacity 0.15s ease-in;
}
.slide-enter-from {
  opacity: 0;
}
.slide-leave-to {
  opacity: 0;
}
</style>
