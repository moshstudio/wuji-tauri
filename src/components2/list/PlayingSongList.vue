<script setup lang="ts">
import type { SongInfo } from '@wuji-tauri/source-extension';
import { useSongStore } from '@/store';
import { SongPlayMode } from '@wuji-tauri/source-extension';
import { Icon } from '@iconify/vue';
import { MSongCard } from '@wuji-tauri/components/src';
import { nextTick, watch } from 'vue';

const show = defineModel<boolean>('show', { default: false });

const songStore = useSongStore();

function onPlay(song: SongInfo) {
  songStore.setPlayingList(songStore.playlist, song);
}
watch(
  show,
  (val) => {
    if (val) {
      nextTick(() => {
        document.querySelectorAll('.playing-song')?.forEach((el) => {
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
        });
      });
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <van-action-sheet
    v-model:show="show"
    title="播放列表"
    teleport="body"
    class="h-[70vh]"
    close
    round
  >
    <div class="flex h-full flex-col overflow-hidden px-2 pb-2">
      <div class="flex select-none pb-2 pl-2">
        <div
          class="playMode rounded-lg border bg-[var(--van-background)] px-2 py-1"
        >
          <div
            v-if="songStore.playMode === SongPlayMode.list"
            class="van-haptics-feedback flex cursor-pointer items-center gap-1 text-sm text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.single"
          >
            <Icon icon="fluent-mdl2:repeat-all" width="18px" height="18px" />
            列表循环
          </div>
          <div
            v-else-if="songStore.playMode === SongPlayMode.single"
            class="van-haptics-feedback flex cursor-pointer items-center gap-1 text-sm text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.random"
          >
            <Icon icon="fluent-mdl2:repeat-one" width="18px" height="18px" />
            单曲循环
          </div>
          <div
            v-else
            class="van-haptics-feedback flex cursor-pointer items-center gap-1 text-sm text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.list"
          >
            <Icon
              icon="lets-icons:sort-random-light"
              width="18px"
              height="18px"
            />
            随机播放
          </div>
        </div>
      </div>
      <div
        class="mobile-scrollbar flex flex-grow flex-col overflow-y-auto pl-2"
        @click.stop
        @touchmove.stop
      >
        <div v-for="song in songStore.playingPlaylist" :key="song.id">
          <MSongCard
            :song="song"
            :is-playing="songStore.isPlaying"
            :is-playing-song="song.id === songStore.playingSong?.id"
            :play="() => onPlay(song)"
            :pause="() => songStore.onPause()"
            :class="song.id === songStore.playingSong?.id ? 'playing-song' : ''"
          />
        </div>
      </div>
    </div>
  </van-action-sheet>
</template>

<style scoped lang="less"></style>
