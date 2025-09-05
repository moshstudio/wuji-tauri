<script setup lang="ts">
import { h } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import MTabbar from '@/layouts/tabbar/MTabbar.vue';
import WTabbar from '@/layouts/tabbar/WTabbar.vue';
import RouterView from '@/views/tabbar/RouterView.vue';

const routerView = h(RouterView);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <MTabbar>
        <component :is="routerView" />
      </MTabbar>
    </template>
    <template #desktop>
      <WTabbar>
        <component :is="routerView" />
      </WTabbar>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
