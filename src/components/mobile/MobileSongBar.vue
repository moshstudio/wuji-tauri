<script setup lang="ts">
import { useSongStore, useSongShelfStore, useDisplayStore } from '@/store';
import { storeToRefs } from 'pinia';
import { computed, nextTick, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import PlayView from '@/views/song/PlayView.vue';
import PlayingPlaylistSheet from '../actionSheets/PlayingPlaylist.vue';
import DraggableSongBar from './DraggableSongBar.vue';

const songStore = useSongStore();
const displayStore = useDisplayStore();
const { playingSong } = storeToRefs(songStore);
const { showPlayView, showPlayingPlaylist } = storeToRefs(displayStore);

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
const togglePlay = () => {
  if (songStore.isPlaying) {
    songStore.onPause();
  } else {
    songStore.onPlay();
  }
};
</script>

<template>
  <PlayView></PlayView>
  <transition name="fade">
    <div v-if="playingSong" class="flex flex-col select-none h-[60px]">
      <div class="grow flex flex-col z-[1002] bg-[--van-background]">
        <div class="w-full h-[6px] z-[1003]">
          <van-slider
            v-model="songStore.audioCurrent"
            :min="0"
            :max="songStore.audioDuration"
            bar-height="4px"
            button-size="6px"
            class="z-[1002]"
            @change="(value) => songStore.seek(value)"
          />
        </div>
        <div
          class="relative flex-grow flex flex-nowrap h-[58px] items-center justify-between px-2 z-[1002]"
        >
          <DraggableSongBar
            @click="() => (showPlayView = !showPlayView)"
          ></DraggableSongBar>
          <div class="right-buttons flex gap-3 px-2">
            <transition name="transform" mode="out-in">
              <div
                label="playButton"
                @click.stop="togglePlay"
                class="cursor-pointer van-haptics-feedback text-[#1989fa] hover:scale-105"
                style="touch-action: manipulation"
              >
                <Icon
                  :icon="
                    songStore.isPlaying ? 'ion:pause-circle' : 'ion:play-circle'
                  "
                  width="24px"
                  height="24px"
                />
              </div>
            </transition>
            <Icon
              icon="solar:playlist-minimalistic-2-bold"
              width="24px"
              height="24px"
              class="cursor-pointer van-haptics-feedback text-gray-400 hover:scale-105"
              @click.stop="() => (showPlayingPlaylist = !showPlayingPlaylist)"
            />
          </div>
        </div>
      </div>
    </div>
  </transition>
  <PlayingPlaylistSheet v-model="showPlayingPlaylist"></PlayingPlaylistSheet>
</template>

<style scoped lang="less">
.transform-enter-active,
.transform-leave-active {
  transition: transform 0.1s linear;
  -webkit-transition: transform 0.1s linear;
}

.transform-enter-from {
  transform: rotateZ(45deg) translateZ(0);
}

.transform-leave-to {
  transform: rotateZ(-45deg) translateZ(0);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
:deep(.van-slider__button) {
  background-color: var(--van-primary-color);
}
</style>
