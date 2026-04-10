<script setup lang="ts">
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppDownloadManager from '@/layouts/app/download/DownloadManager.vue';
import DesktopDownloadManager from '@/layouts/desktop/download/DownloadManager.vue';
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppDownloadManager />
    </template>
    <template #desktop>
      <DesktopDownloadManager />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
