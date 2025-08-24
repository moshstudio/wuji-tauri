<script setup lang="ts">
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import RouterView from '@/views/tabbar/RouterView.vue';
import MTabbar from '@/layouts/tabbar/MTabbar.vue';
import WTabbar from '@/layouts/tabbar/WTabbar.vue';
import { h } from 'vue';

const routerView = h(RouterView);
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <MTabbar>
        <component :is="routerView"></component>
      </MTabbar>
    </template>
    <template #desktop>
      <WTabbar>
        <component :is="routerView"></component>
      </WTabbar>
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
