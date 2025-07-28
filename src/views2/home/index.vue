<script setup lang="ts">
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import AppHome from '@/layouts/app/home/index.vue';
import DesktopHome from '@/layouts/desktop/home/index.vue';
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppHome />
    </template>
    <template #desktop>
      <DesktopHome />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
