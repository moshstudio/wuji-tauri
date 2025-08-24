<script setup lang="ts">
import MNavBar from '@/components/header/MNavBar.vue';
import MSongBar from '@/components/songbar/MSongBar.vue';
import { MPlaylistShelfCard } from '@wuji-tauri/components/src';
import { useDisplayStore, useSongShelfStore } from '@/store';
import { showPromptDialog } from '@/utils/usePromptDialog';
import { router } from '@/router';

defineProps<{
  createShelf: (name: string) => void;
}>();
const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();

const toDetail = (shelfId: string) => {
  router.push({ name: 'SongShelfDetail', params: { shelfId } });
};
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="音乐收藏">
      <template #right>
        <van-icon
          name="plus"
          @click="
            () => {
              showPromptDialog({
                title: '创建歌单',
                message: '请输入歌单名称',
                placeholder: '请输入歌单名称',
                defaultValue: '',
                confirmText: '创建',
                cancelText: '取消',
              }).then((name) => {
                if (name) {
                  createShelf(name);
                }
              });
            }
          "
        ></van-icon>
      </template>
    </MNavBar>

    <div class="flex flex-1 flex-col gap-1 overflow-y-auto p-2 text-sm">
      <MPlaylistShelfCard
        :shelf="shelfStore.songLikeShelf"
        :click="
          () => {
            toDetail(shelfStore.songLikeShelf.playlist.id);
          }
        "
      ></MPlaylistShelfCard>
      <p class="text-gray-400">
        创建的歌单({{ shelfStore.songCreateShelf.length }})
      </p>
      <MPlaylistShelfCard
        v-for="shelf in shelfStore.songCreateShelf"
        :key="shelf.playlist.id + 'create'"
        :shelf="shelf"
        :removeable="true"
        :click="
          () => {
            toDetail(shelf.playlist.id);
          }
        "
        :remove-from-shelf="
          () => {
            shelfStore.removeSongShelf(shelf.playlist.id);
          }
        "
      ></MPlaylistShelfCard>
      <p class="text-gray-400">
        收藏的歌单({{ shelfStore.songPlaylistShelf.length }})
      </p>
      <MPlaylistShelfCard
        v-for="shelf in shelfStore.songPlaylistShelf"
        :key="shelf.playlist.id + 'collect'"
        :shelf="shelf"
        :removeable="true"
        :click="
          () => {
            toDetail(shelf.playlist.id);
          }
        "
        :remove-from-shelf="
          () => {
            shelfStore.removeSongShelf(shelf.playlist.id);
          }
        "
      ></MPlaylistShelfCard>
    </div>
    <MSongBar></MSongBar>
  </div>
</template>

<style scoped lang="less"></style>
