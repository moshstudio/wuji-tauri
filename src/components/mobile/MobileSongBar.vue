<script setup lang="ts">
import { useSongStore, useSongShelfStore } from '@/store';
import { storeToRefs } from 'pinia';
import { ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { joinSongArtists } from '@/utils';
import PlayView from '@/views/song/PlayView.vue';
import PlayingPlaylistSheet from '../actionSheets/PlayingPlaylist.vue';

const showPlayView = defineModel('showPlayView', {
  type: Boolean,
  default: false,
});
const songStore = useSongStore();
const { playingSong } = storeToRefs(songStore);

const showPlayingPlaylist = ref(false);
watch(showPlayView, (value) => {
  if (value) {
    showPlayingPlaylist.value = false;
  } else {
    if (!value && showPlayingPlaylist.value) {
      showPlayingPlaylist.value = false;
      showPlayView.value = true;
    }
  }
});
</script>

<template>
  <PlayView v-model:show="showPlayView"></PlayView>
  <transition name="fade">
    <div
      class="flex flex-col border-t-[1px] select-none h-[60px] z-[1002] bg-[--van-background]"
      v-if="playingSong"
      @click="() => (showPlayView = !showPlayView)"
    >
      <div
        class="flex-grow flex flex-nowrap h-[60px] items-center justify-between px-2 z-[1002]"
      >
        <div class="flex gap-4 max-w-[calc(100%-50px)]">
          <div class="w-[30px] h-[30px]">
            <van-image
              width="30"
              height="30"
              radius="99999"
              fit="cover"
              lazy-load
              :src="playingSong.picUrl"
              class="cursor-pointer hover:-translate-y-1 trasnform ease-in-out duration-100"
            >
              <template #loading>
                <Icon
                  icon="pepicons-pop:music-note-double"
                  width="16"
                  height="16"
                />
              </template>
              <template #error>
                <Icon
                  icon="pepicons-pop:music-note-double"
                  width="16"
                  height="16"
                />
              </template>
            </van-image>
          </div>

          <div class="flex flex-col justify-center truncate">
            <span class="text-xs font-bold text-[--van-text-color]">
              {{ playingSong.name }} -
              {{ joinSongArtists(playingSong.artists) }}
            </span>
          </div>
        </div>
        <div class="right-buttons flex gap-2">
          <div label="playButton">
            <transition name="transform" mode="out-in">
              <Icon
                icon="ion:pause-circle"
                width="24px"
                height="24px"
                class="cursor-pointer van-haptics-feedback text-[#1989fa] hover:scale-105"
                @click.stop="() => songStore.onPause()"
                v-if="songStore.isPlaying"
              />
              <Icon
                icon="ion:play-circle"
                width="24px"
                height="24px"
                class="cursor-pointer van-haptics-feedback text-[#1989fa] hover:scale-105"
                @click.stop="() => songStore.onPlay()"
                v-else
              />
            </transition>
          </div>
          <Icon
            icon="solar:playlist-minimalistic-2-bold"
            width="24px"
            height="24px"
            class="cursor-pointer van-haptics-feedback text-gray-400 hover:scale-105"
            @click.stop="() => (showPlayingPlaylist = !showPlayingPlaylist)"
          />
        </div>
      </div>
      <div class="w-full h-[6px]">
        <van-slider
          v-model="songStore.audioCurrent"
          :min="0"
          :max="songStore.audioDuration"
          button-size="8px"
          class="z-[1000] translate-y-[3px]"
          @change="(value) => songStore.seek(value)"
        />
      </div>
    </div>
  </transition>
  <PlayingPlaylistSheet v-model="showPlayingPlaylist"></PlayingPlaylistSheet>
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
