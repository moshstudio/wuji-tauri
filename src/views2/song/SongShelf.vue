<script setup lang="ts">
import PlatformSwitch from '@/components2/platform/PlatformSwitch.vue';
import AppSongShelf from '@/layouts/app/song/SongShelf.vue';
import DesktopSongShelf from '@/layouts/desktop/song/SongShelf.vue';
import { useSongShelfStore } from '@/store';
import { showToast } from 'vant';

const shelfStore = useSongShelfStore();
function createShelf(name: string) {
  name = name.trim();
  if (!name) return;
  if (shelfStore.songCreateShelf.some((item) => item.playlist.name === name)) {
    showToast('收藏夹已存在');
    return;
  }
  shelfStore.createShelf(name);
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSongShelf :create-shelf="createShelf" />
    </template>
    <template #desktop>
      <DesktopSongShelf :create-shelf="createShelf" />
    </template>
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
