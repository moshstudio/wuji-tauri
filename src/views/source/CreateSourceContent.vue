<script setup lang="ts">
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppCreateSource from '@/layouts/app/source/createSource/index.vue';
import DesktopCreateSource from '@/layouts/desktop/source/createSource/index.vue';
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppCreateSource />
    </template>
    <template #desktop>
      <DesktopCreateSource />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
