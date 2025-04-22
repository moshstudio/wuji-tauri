<script setup lang="ts">
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import { SongPlayMode } from '@/types/song';
import { joinSongArtists, transTime } from '@/utils';
import PlayView from '@/views/song/PlayView.vue';
import { Icon } from '@iconify/vue';
import { storeToRefs } from 'pinia';
import WinSongCard from '../card/songCards/WinSongCard.vue';
import LoadImage from '../LoadImage.vue';
import VolumeControl from './VolumeControl.vue';

const songStore = useSongStore();
const displayStore = useDisplayStore();
const shelfStore = useSongShelfStore();
const { playingSong, audioVolume } = storeToRefs(songStore);
const { showPlayingPlaylist } = storeToRefs(displayStore);
</script>

<template>
  <div
    class="flex justify-between items-center py-2 px-4 border-t-[1px] select-none flex-nowrap h-[80px] z-[1000] bg-[--van-background]"
  >
    <div class="flex gap-4 shrink-0">
      <LoadImage
        :width="50"
        :height="50"
        :radius="99999"
        fit="cover"
        lazy-load
        :src="playingSong?.picUrl || ''"
        :headers="playingSong?.picHeaders"
        class="cursor-pointer hover:-translate-y-1 trasnform ease-in-out duration-100"
        @click="() => (displayStore.showPlayView = !displayStore.showPlayView)"
      >
        <template #loading>
          <Icon icon="pepicons-pop:music-note-double" width="25" height="25" />
        </template>
        <template #error>
          <Icon icon="pepicons-pop:music-note-double" width="25" height="25" />
        </template>
      </LoadImage>
      <div class="flex flex-col justify-center w-[140px]">
        <span
          v-if="playingSong"
          class="text-base text-[--van-text-color] truncate"
        >
          {{ playingSong.name }}
        </span>
        <span v-if="playingSong" class="text-sm text-gray-500 truncate">
          {{ joinSongArtists(playingSong.artists) }}
        </span>
      </div>
    </div>
    <div class="flex grow flex-col justify-center items-center h-[80px]">
      <div class="flex gap-4 justify-center items-center mb-1">
        <div class="clickable">
          <Icon
            v-if="shelfStore.songInLikeShelf(songStore.playingSong)"
            icon="weui:like-filled"
            width="22px"
            height="22px"
            class="cursor-pointer van-haptics-feedback text-red-600"
            @click="() => shelfStore.removeSongFromShelf(songStore.playingSong)"
          />
          <Icon
            v-else
            icon="weui:like-outlined"
            width="22px"
            height="22px"
            class="cursor-pointer van-haptics-feedback text-[--van-text-color]"
            @click="() => shelfStore.addSongToShelf(songStore.playingSong)"
          />
        </div>
        <Icon
          icon="ion:play-skip-back"
          width="22px"
          height="22px"
          class="cursor-pointer van-haptics-feedback text-[--van-text-color]"
          @click="() => songStore.prevSong()"
        />
        <div label="playButton">
          <transition name="transform" mode="out-in">
            <Icon
              v-if="songStore.isPlaying"
              icon="ion:pause-circle"
              width="40px"
              height="40px"
              class="cursor-pointer van-haptics-feedback text-[#fc3d4a] hover:scale-105"
              @click="() => songStore.onPause()"
            />
            <Icon
              v-else
              icon="ion:play-circle"
              width="40px"
              height="40px"
              class="cursor-pointer van-haptics-feedback text-[#fc3d4a] hover:scale-105"
              @click="() => songStore.onPlay()"
            />
          </transition>
        </div>

        <Icon
          icon="ion:play-skip-forward"
          width="22px"
          height="22px"
          class="cursor-pointer van-haptics-feedback text-[--van-text-color]"
          @click="() => songStore.nextSong()"
        />
        <div label="playMode">
          <Icon
            v-if="songStore.playMode === SongPlayMode.list"
            icon="ic:round-list"
            width="22px"
            height="22px"
            class="cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.single"
          />
          <Icon
            v-else-if="songStore.playMode === SongPlayMode.single"
            icon="typcn:arrow-loop"
            width="22px"
            height="22px"
            class="cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.random"
          />
          <Icon
            v-else
            icon="fe:random"
            width="22px"
            height="22px"
            class="cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
            @click="songStore.playMode = SongPlayMode.list"
          />
        </div>
      </div>
      <div class="flex gap-4 items-center">
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
    <div class="flex gap-4 shrink-0 justify-end w-[120px]">
      <VolumeControl v-model="audioVolume" />
      <Icon
        icon="iconamoon:playlist-fill"
        width="22px"
        height="22px"
        class="cursor-pointer van-haptics-feedback text-gray-400 hover:text-[--van-text-color]"
        @click="() => (showPlayingPlaylist = !showPlayingPlaylist)"
      />
    </div>
  </div>
  <van-popup
    v-model:show="showPlayingPlaylist"
    position="right"
    :style="{ width: '200px', height: '100%' }"
  >
    <div class="flex flex-col gap-2 p-2 overflow-y-auto overflow-x-hidden">
      <template v-for="item in songStore.playingPlaylist" :key="item.id">
        <WinSongCard
          :song="item"
          :class="item.id === songStore.playingSong?.id ? 'playing-song' : ''"
          @play="() => songStore.setPlayingList(songStore.playlist, item)"
        />
      </template>
    </div>
  </van-popup>
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
