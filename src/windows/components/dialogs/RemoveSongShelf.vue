<script setup lang="ts">
import { useDisplayStore, useSongShelfStore } from "@/store";
import { showToast } from "vant";

const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();

const removeSongShelf = (shelfId: string) => {
  if (!shelfId) return;
  const res = shelfStore.removeSongShelf(shelfId);
  if (res) {
    showToast("收藏夹删除成功");
  }
};
</script>

<template>
  <van-dialog
    v-model:show="displayStore.showRemoveSongShelfDialog"
    title="删除音乐收藏夹"
  >
    <van-cell-group inset class="max-h-[50vh] overflow-y-auto">
      <van-cell
        v-for="shelf in shelfStore.songCreateShelf"
        :key="shelf.playlist.id"
        :title="shelf.playlist.name"
        :label="`共有 ${shelf.playlist.list?.list.length || 0} 首歌`"
        center
      >
        <template #value>
          <van-button
            icon="delete"
            size="small"
            type="danger"
            round
            @click="removeSongShelf(shelf.playlist.id)"
          >
          </van-button>
        </template>
      </van-cell>
      <van-cell
        v-for="shelf in shelfStore.songPlaylistShelf"
        :key="shelf.playlist.id"
        :title="shelf.playlist.name"
        center
      >
        <template #value>
          <van-button
            icon="delete"
            size="small"
            type="danger"
            round
            @click="removeSongShelf(shelf.playlist.id)"
          >
          </van-button>
        </template>
      </van-cell>
    </van-cell-group>
  </van-dialog>
</template>

<style scoped lang="less"></style>
