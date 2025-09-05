<script setup lang="ts">
import type { SongInfo } from '@wuji-tauri/source-extension';
import { Icon } from '@iconify/vue';
import { MSongCard } from '@wuji-tauri/components/src';
import { SongPlayMode } from '@wuji-tauri/source-extension';
import { nextTick, watch } from 'vue';
import { useSongStore } from '@/store';

const show = defineModel<boolean>('show', { required: true });

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
          class="playMode bg-[var(--van-background)]/50 rounded-lg border px-2 py-1"
        >
          <div
            v-if="songStore.playMode === SongPlayMode.list"
            class="van-haptics-feedback flex items-center gap-1"
            @click="songStore.playMode = SongPlayMode.single"
          >
            <Icon icon="fluent-mdl2:repeat-all" width="14px" height="14px" />
            <div class="text-xs text-[var(--van-text-color-2)]">列表循环</div>
          </div>
          <div
            v-else-if="songStore.playMode === SongPlayMode.single"
            class="van-haptics-feedback flex items-center gap-1"
            @click="songStore.playMode = SongPlayMode.random"
          >
            <Icon icon="fluent-mdl2:repeat-one" width="14px" height="14px" />
            <div class="text-xs text-[var(--van-text-color-2)]">单曲循环</div>
          </div>
          <div
            v-else
            class="van-haptics-feedback flex items-center gap-1"
            @click="songStore.playMode = SongPlayMode.list"
          >
            <Icon
              icon="lets-icons:sort-random-light"
              width="14px"
              height="14px"
            />
            <div class="text-xs text-[var(--van-text-color-2)]">随机播放</div>
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
