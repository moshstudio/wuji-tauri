<script setup lang="ts">
import { provide } from 'vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import {
  DownloadManagerKey,
  useDownloadManager,
} from '@/composables/useDownloadManager';
import AppDownloadManager from '@/layouts/app/download/DownloadManager.vue';
import DesktopDownloadManager from '@/layouts/desktop/download/DownloadManager.vue';
import DownloadDialogs from '@/layouts/download/DownloadDialogs.vue';

const manager = useDownloadManager();
provide(DownloadManagerKey, manager);
</script>

<template>
  <div class="h-full w-full">
    <PlatformSwitch>
      <template #app>
        <AppDownloadManager />
      </template>
      <template #desktop>
        <DesktopDownloadManager />
      </template>
    </PlatformSwitch>

    <!-- 共享弹窗 -->
    <DownloadDialogs />
  </div>
</template>
