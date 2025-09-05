<script setup lang="ts">
import { Icon } from '@iconify/vue';
import { storeToRefs } from 'pinia';
import { router } from '@/router';
import { useDisplayStore, useSongStore } from '@/store';
import PlayingSongList from '../list/PlayingSongList.vue';
import DraggableSongBar from './DraggableSongBar.vue';

const songStore = useSongStore();
const displayStore = useDisplayStore();
const { playingSong } = storeToRefs(songStore);
const { showSongPlayingList } = storeToRefs(displayStore);

function togglePlay() {
  if (songStore.isPlaying) {
    songStore.onPause();
  } else {
    songStore.onPlay();
  }
}
</script>

<template>
  <transition name="fade">
    <div v-if="playingSong" class="flex h-[60px] shrink-0 select-none flex-col">
      <div class="z-[1002] flex grow flex-col bg-[--van-background]">
        <div class="z-[1003] h-[6px] w-full">
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
          class="relative z-[1002] flex h-[58px] flex-grow flex-nowrap items-center justify-between px-2"
        >
          <DraggableSongBar
            @click="
              () => {
                router.push({ name: 'SongPlayView' });
              }
            "
          />
          <div class="right-buttons flex gap-3 px-2">
            <transition name="transform" mode="out-in">
              <div
                label="playButton"
                class="van-haptics-feedback cursor-pointer text-[#1989fa] hover:scale-105"
                style="touch-action: manipulation"
                @click.stop="togglePlay"
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
              class="van-haptics-feedback cursor-pointer text-gray-400 hover:scale-105"
              @click.stop="() => (showSongPlayingList = !showSongPlayingList)"
            />
          </div>
        </div>
      </div>
    </div>
  </transition>
  <PlayingSongList v-model:show="showSongPlayingList" />
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
