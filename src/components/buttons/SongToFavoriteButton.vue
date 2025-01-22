<script setup lang="ts">
import { SongInfo } from '@/extensions/song';
import { useSongShelfStore } from '@/store';
const { song } = defineProps<{
  song: SongInfo;
  size?: number;
}>();

const shelfStore = useSongShelfStore();
</script>

<template>
  <div class="clickable">
    <van-icon
      class="text-red-600"
      name="like"
      :size="size || 20"
      @click="() => shelfStore.removeSongFromShelf(song)"
      v-if="shelfStore.songInLikeShelf(song)"
    />
    <van-icon
      class="text-[--van-text-color]"
      name="like-o"
      :size="size || 20"
      @click="() => shelfStore.addSongToShelf(song)"
      v-else
    />
  </div>
</template>

<style scoped lang="less"></style>
