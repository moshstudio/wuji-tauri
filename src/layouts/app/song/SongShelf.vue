<script setup lang="ts">
import { MPlaylistShelfCard } from '@wuji-tauri/components';
import MNavBar from '@/components/header/MNavBar.vue';
import MSongBar from '@/components/songbar/MSongBar.vue';
import { router } from '@/router';
import { useSongShelfStore } from '@/store';

defineProps<{
  openAddMenu: () => void;
}>();
const shelfStore = useSongShelfStore();

function toDetail(shelfId: string) {
  router.push({ name: 'SongShelfDetail', params: { shelfId } });
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <MNavBar title="音乐收藏">
      <template #right>
        <van-icon
          name="plus"
          @click="openAddMenu"
        />
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
      />
      <p class="text-gray-400">
        创建的歌单({{ shelfStore.songCreateShelf.length }})
      </p>
      <MPlaylistShelfCard
        v-for="shelf in shelfStore.songCreateShelf"
        :key="`${shelf.playlist.id}create`"
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
      />
      <p class="text-gray-400">
        收藏的歌单({{ shelfStore.songPlaylistShelf.length }})
      </p>
      <MPlaylistShelfCard
        v-for="shelf in shelfStore.songPlaylistShelf"
        :key="`${shelf.playlist.id}collect`"
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
      />
    </div>
    <MSongBar />
  </div>
</template>

<style scoped lang="less"></style>
