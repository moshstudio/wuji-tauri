<script setup lang="ts">
import type { SongInfo } from '@wuji-tauri/source-extension';

withDefaults(
  defineProps<{
    song: SongInfo;
    inLikeShelf?: boolean;
    size?: number;
    addToLikeShelf: (song: SongInfo) => void;
    removeFromLikeShelf: (song: SongInfo) => void;
  }>(),
  { size: 20, inLikeShelf: false },
);
</script>

<template>
  <div class="van-haptics-feedback">
    <van-icon
      v-if="inLikeShelf"
      class="text-red-600"
      name="like"
      :size="size"
      @click="() => removeFromLikeShelf(song)"
    />
    <van-icon
      v-else
      class="text-[--van-text-color]"
      name="like-o"
      :size="size"
      @click="() => addToLikeShelf(song)"
    />
  </div>
</template>

<style scoped lang="less"></style>
