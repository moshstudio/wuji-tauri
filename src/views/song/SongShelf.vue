<script setup lang="ts">
import { showToast } from 'vant';
import { ref } from 'vue';
import ImportPlaylist from '@/components/dialog/ImportPlaylist.vue';
import PlatformSwitch from '@/components/platform/PlatformSwitch.vue';
import AppSongShelf from '@/layouts/app/song/SongShelf.vue';
import DesktopSongShelf from '@/layouts/desktop/song/SongShelf.vue';
import { useSongShelfStore } from '@/store';
import { showPromptDialog } from '@/utils/usePromptDialog';

const shelfStore = useSongShelfStore();

const showAddSheet = ref(false);
const showImportPlaylist = ref(false);

const addSheetActions = [
  {
    name: '创建歌单',
    callback: () => {
      showAddSheet.value = false;
      openCreateDialog();
    },
  },
  {
    name: '导入歌单',
    subname: '网易云音乐',
    callback: () => {
      showAddSheet.value = false;
      showImportPlaylist.value = true;
    },
  },
];

function createShelf(name: string) {
  name = name.trim();
  if (!name)
    return;
  if (shelfStore.songCreateShelf.some(item => item.playlist.name === name)) {
    showToast('收藏夹已存在');
    return;
  }
  shelfStore.createShelf(name);
}

function openCreateDialog() {
  showPromptDialog({
    title: '创建歌单',
    message: '请输入歌单名称',
    placeholder: '请输入歌单名称',
    defaultValue: '',
    confirmText: '创建',
    cancelText: '取消',
  }).then((name) => {
    if (name)
      createShelf(name);
  });
}

function openAddMenu() {
  showAddSheet.value = true;
}
</script>

<template>
  <PlatformSwitch>
    <template #app>
      <AppSongShelf :open-add-menu="openAddMenu" />
    </template>
    <template #desktop>
      <DesktopSongShelf :open-add-menu="openAddMenu" />
    </template>
    <van-action-sheet
      v-model:show="showAddSheet"
      :actions="addSheetActions"
      cancel-text="取消"
      teleport="body"
    />
    <ImportPlaylist v-model:show="showImportPlaylist" />
  </PlatformSwitch>
</template>

<style scoped lang="less"></style>
