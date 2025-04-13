<script setup lang="ts">
import type { SongInfo } from '@/extensions/song';
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
      v-if="shelfStore.songInLikeShelf(song)"
      class="text-red-600"
      name="like"
      :size="size || 20"
      @click="() => shelfStore.removeSongFromShelf(song)"
    />
    <van-icon
      v-else
      class="text-[--van-text-color]"
      name="like-o"
      :size="size || 20"
      @click="() => shelfStore.addSongToShelf(song)"
    />
  </div>
</template>

<style scoped lang="less"></style>
