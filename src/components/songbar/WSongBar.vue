<script setup lang="ts">
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import {
  PlaylistInfo,
  SongInfo,
  SongPlayMode,
  SongShelf,
} from '@wuji-tauri/source-extension';
import { joinSongArtists } from '@wuji-tauri/components/src/components/cards/song';
import { transTime } from '@/utils';
import { Icon } from '@iconify/vue';
import { storeToRefs } from 'pinia';
import { WSongCard } from '@wuji-tauri/components/src';
import { LoadImage } from '@wuji-tauri/components/src';
import VolumeControl from './VolumeControl.vue';
import {
  MoreOptionsSheet,
  SongSelectShelfSheet,
} from '@wuji-tauri/components/src';
import { router } from '@/router';
import { ref } from 'vue';

const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const { playingSong, audioVolume } = storeToRefs(songStore);
const showPlayingSongList = ref(false);

const moreOptions = ref(false);
const moreOptionsSong = ref<SongInfo>();
const showAddToShelfSheet = ref(false);

function showMoreOptions(song: SongInfo) {
  moreOptionsSong.value = song;
  moreOptions.value = true;
}

function songAddToShelf(song: SongInfo, shelf: SongShelf) {
  shelfStore.addSongToShelf(song, shelf.playlist.id);
}
</script>

<template>
  <div
    class="z-[1000] flex h-[80px] select-none flex-nowrap items-center justify-between border-t-[1px] bg-[--van-background] px-4 py-2"
  >
    <div class="flex shrink-0 gap-4">
      <LoadImage
        :width="50"
        :height="50"
        :radius="99999"
        fit="cover"
        :src="playingSong?.picUrl || ''"
        :headers="playingSong?.picHeaders"
        class="active-bg-scale"
        @click="
          () => {
            router.push({ name: 'SongPlayView' });
          }
        "
      >
        <template #loading>
          <Icon icon="pepicons-pop:music-note-double" width="25" height="25" />
        </template>
        <template #error>
          <Icon icon="pepicons-pop:music-note-double" width="25" height="25" />
        </template>
      </LoadImage>
      <div class="flex w-[140px] flex-col justify-center">
        <span
          v-if="playingSong"
          class="truncate text-base text-[--van-text-color]"
        >
          {{ playingSong.name }}
        </span>
        <span v-if="playingSong" class="truncate text-sm text-gray-500">
          {{ joinSongArtists(playingSong.artists) }}
        </span>
      </div>
    </div>
    <div class="flex h-[80px] grow flex-col items-center justify-center">
      <div class="mb-1 flex items-center justify-center gap-4">
        <div class="clickable">
          <Icon
            v-if="shelfStore.songInLikeShelf(songStore.playingSong)"
            icon="weui:like-filled"
            width="22px"
            height="22px"
            class="van-haptics-feedback cursor-pointer text-red-600"
            @click="() => shelfStore.removeSongFromShelf(songStore.playingSong)"
          />
          <Icon
            v-else
            icon="weui:like-outlined"
            width="22px"
            height="22px"
            class="van-haptics-feedback cursor-pointer text-[--van-text-color]"
            @click="() => shelfStore.addSongToShelf(songStore.playingSong)"
          />
        </div>
        <Icon
          icon="ion:play-skip-back"
          width="22px"
          height="22px"
          class="van-haptics-feedback cursor-pointer text-[--van-text-color]"
          @click="() => songStore.prevSong()"
        />
        <div label="playButton">
          <transition name="transform" mode="out-in">
            <Icon
              v-if="songStore.isPlaying"
              icon="ion:pause-circle"
              width="40px"
              height="40px"
              class="van-haptics-feedback cursor-pointer text-[#fc3d4a] hover:scale-105"
              @click="() => songStore.onPause()"
            />
            <Icon
              v-else
              icon="ion:play-circle"
              width="40px"
              height="40px"
              class="van-haptics-feedback cursor-pointer text-[#fc3d4a] hover:scale-105"
              @click="() => songStore.onPlay()"
            />
          </transition>
        </div>

        <Icon
          icon="ion:play-skip-forward"
          width="22px"
          height="22px"
          class="van-haptics-feedback cursor-pointer text-[--van-text-color]"
          @click="() => songStore.nextSong()"
        />
        <div label="playMode">
          <Icon
            v-if="songStore.playMode === SongPlayMode.list"
            icon="fluent-mdl2:repeat-all"
            width="18"
            height="18"
            class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.single"
          />
          <Icon
            v-else-if="songStore.playMode === SongPlayMode.single"
            icon="fluent-mdl2:repeat-one"
            width="18"
            height="18"
            class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.random"
          />
          <Icon
            v-else
            icon="lets-icons:sort-random-light"
            width="18"
            height="18"
            class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.list"
          />
        </div>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs text-gray-400">
          {{ transTime(songStore.audioCurrent) }}
        </span>
        <div class="w-[200px]">
          <van-slider
            v-model="songStore.audioCurrent"
            :min="0"
            :max="songStore.audioDuration"
            button-size="12px"
            @change="(value) => songStore.seek(value)"
          />
        </div>

        <span class="text-xs text-gray-400">
          {{ transTime(songStore.audioDuration) }}
        </span>
      </div>
    </div>
    <div class="flex w-[120px] shrink-0 justify-end gap-4">
      <VolumeControl v-model="audioVolume" />
      <Icon
        icon="iconamoon:playlist-fill"
        width="22px"
        height="22px"
        class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
        @click="() => (showPlayingSongList = !showPlayingSongList)"
      />
    </div>
    <van-popup
      v-model:show="showPlayingSongList"
      position="right"
      :style="{ width: '200px', height: '100%' }"
    >
      <div class="flex flex-col gap-2 overflow-y-auto overflow-x-hidden p-2">
        <template v-for="p in songStore.playingPlaylist" :key="p.id">
          <WSongCard
            :song="p"
            :shelfs="shelfStore.songCreateShelf"
            :is-playing="songStore.isPlaying"
            :is-playing-song="p.id === songStore.playingSong?.id"
            :play="() => songStore.setPlayingList(songStore.playlist, p)"
            :pause="() => songStore.onPause()"
            :in-like-shelf="shelfStore.songInLikeShelf(p)"
            :add-to-like-shelf="shelfStore.addSongToShelf"
            :remove-from-like-shelf="shelfStore.removeSongFromShelf"
            :show-more-options="showMoreOptions"
          />
        </template>
      </div>
    </van-popup>
    <MoreOptionsSheet
      v-model="moreOptions"
      :actions="[
        {
          name: '添加到收藏夹',
          color: '#1989fa',
          callback: () => {
            moreOptions = false;
            showAddToShelfSheet = true;
          },
        },
      ]"
    />
    <SongSelectShelfSheet
      v-if="moreOptionsSong"
      v-model:show="showAddToShelfSheet"
      :song="moreOptionsSong"
      :shelfs="shelfStore.songCreateShelf"
      :add-to-shelf="songAddToShelf"
    />
  </div>
</template>

<style scoped lang="less">
.transform-enter-active,
.transform-leave-active {
  transition: all 0.05s linear;
}

.transform-enter-from {
  transform: rotateZ(45deg);
}

.transform-leave-to {
  transform: rotateZ(-45deg);
}
</style>
