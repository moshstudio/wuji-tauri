<script lang="ts" setup>
import type { Lyric } from '@/utils/lyric';
import { MoreOptionsSheet } from '@wuji-tauri/components/src';
import { LoadImage, PlayPauseButton } from '@wuji-tauri/components/src';
import { useDisplayStore, useSongShelfStore, useSongStore } from '@/store';
import { transTime } from '@/utils';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { joinSongArtists } from '@wuji-tauri/components/src/components/cards/song';
import { Icon } from '@iconify/vue';
import { SongPlayMode } from '@wuji-tauri/source-extension';
import PlayingSongList from '@/components/list/PlayingSongList.vue';

withDefaults(
  defineProps<{
    lyric?: Lyric;
    activeIndex?: number;
    transformStyle: string;
    back: () => void;
  }>(),
  {
    lyric: () => [
      {
        position: 0,
        lyric: '没有歌词',
      },
    ],
    activeIndex: 0,
  },
);
const songStore = useSongStore();
const shelfStore = useSongShelfStore();
const displayStore = useDisplayStore();
const { playingSong } = storeToRefs(songStore);

const showLyric = ref(true);
const showPlayingSongList = ref(false);
const showMoreOptions = ref(false);
const showAddToShelfSheet = ref(false);
const actions = computed(() => {
  return shelfStore.songCreateShelf.map((item) => {
    const existed = item.playlist.list?.list.some(
      (s) => s.id === playingSong.value.id,
    );
    return {
      name: item.playlist.name,
      subname: existed
        ? '已添加'
        : `共 ${item.playlist.list?.list.length || 0} 首`,
      color: '#1989fa',
      disabled: existed,
      callback: () => {
        showAddToShelfSheet.value = false;
        shelfStore.addSongToShelf(playingSong.value, item.playlist.id);
      },
    };
  });
});
</script>

<template>
  <div class="relative flex h-full w-full flex-col overflow-hidden">
    <div class="absolute inset-0">
      <LoadImage
        :src="playingSong.bigPicUrl || playingSong.picUrl"
        :headers="playingSong.picHeaders"
        class="h-full w-full"
      >
        <template #loading>
          <img src="@/assets/song-bg.jpg" alt="" />
        </template>
        <template #error>
          <img src="@/assets/song-bg.jpg" alt="" />
        </template>
      </LoadImage>
    </div>

    <div class="relative flex h-full w-full flex-col">
      <!-- 按钮区域 -->
      <div class="z-[12] bg-black/25 px-4 py-2 shadow-lg backdrop-blur-lg">
        <div
          class="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent opacity-30"
        ></div>
        <van-icon
          name="arrow-left"
          class="van-haptics-feedback text-white"
          @click.self="() => back()"
        />
      </div>

      <div
        class="relative z-[11] min-h-0 flex-1"
        @click="showLyric = !showLyric"
      >
        <!-- 背景模糊层，当显示歌词时出现 -->
        <div
          class="absolute inset-0 backdrop-blur-lg backdrop-filter transition-opacity duration-300"
          :class="showLyric ? 'opacity-100' : 'opacity-0'"
          :style="{
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }"
        ></div>
        <div v-if="showLyric">
          <div v-if="lyric">
            <ul
              class="mt-[30vh] flex h-full max-h-full w-full flex-col items-center justify-start gap-[10px] overflow-hidden p-6 text-center transition duration-500 ease-in-out"
              :style="transformStyle"
            >
              <li
                v-for="(item, index) in lyric"
                :key="item.position"
                class="lyric-line leading-1 cursor-pointer list-none text-sm text-white transition duration-500 ease-in-out"
                :class="activeIndex === index ? 'active-line' : ''"
                :data-index="index"
              >
                <p>{{ item.lyric }}</p>
              </li>
            </ul>
          </div>
          <div v-else class="text-sm text-white">没有歌词</div>
        </div>
      </div>
      <!-- 控制区域 -->
      <div
        class="relative z-[12] flex flex-col gap-2 bg-black/25 px-4 py-2 shadow-lg backdrop-blur-lg"
      >
        <div
          class="absolute left-0 right-0 top-0 h-4 bg-gradient-to-b from-white to-transparent opacity-30"
        ></div>
        <div class="flex w-full items-center justify-between pt-2">
          <div class="flex flex-col">
            <p class="text-base font-bold text-gray-200">
              {{ playingSong.name || '等待播放' }}
            </p>
            <p class="text-sm text-gray-300">
              {{ joinSongArtists(playingSong.artists) || '' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <div class="van-haptics-feedback">
              <van-icon
                v-if="shelfStore.songInLikeShelf(playingSong)"
                class="text-red-600"
                name="like"
                :size="20"
                @click="() => shelfStore.removeSongFromShelf(playingSong)"
              />
              <van-icon
                v-else
                class="text-gray-300"
                name="like-o"
                :size="20"
                @click="() => shelfStore.addSongToShelf(playingSong)"
              />
            </div>
            <div class="van-haptics-feedback">
              <van-icon
                name="ellipsis"
                class="clickable p-2 text-gray-300"
                :size="20"
                @click="() => (showMoreOptions = !showMoreOptions)"
              />
            </div>
          </div>
        </div>
        <van-slider
          v-model="songStore.audioCurrent"
          :min="0"
          :max="songStore.audioDuration"
          button-size="8px"
          active-color="rgba(220, 220, 220, 0.7)"
          inactive-color="rgba(255, 255, 255, 0.3)"
          @change="(value) => songStore.seek(value)"
          class="mt-2"
        />
        <div class="mb-2 flex items-center justify-between">
          <span class="text-xs text-gray-300">
            {{ transTime(songStore.audioCurrent) }}
          </span>
          <span class="text-right text-xs text-gray-300">
            {{ transTime(songStore.audioDuration) }}
          </span>
        </div>
        <div class="flex w-full items-center justify-between">
          <div label="playMode">
            <Icon
              v-if="songStore.playMode === SongPlayMode.list"
              icon="fluent-mdl2:repeat-all"
              width="19"
              height="19"
              color="rgba(220, 220, 220, 0.7)"
              class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
              @click="songStore.playMode = SongPlayMode.single"
            />
            <Icon
              v-else-if="songStore.playMode === SongPlayMode.single"
              icon="fluent-mdl2:repeat-one"
              width="19"
              height="19"
              color="rgba(220, 220, 220, 0.7)"
              class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
              @click="songStore.playMode = SongPlayMode.random"
            />
            <Icon
              v-else
              icon="lets-icons:sort-random-light"
              width="19"
              height="19"
              color="rgba(220, 220, 220, 0.7)"
              class="van-haptics-feedback cursor-pointer text-gray-400 hover:text-[--van-text-color]"
              @click="songStore.playMode = SongPlayMode.list"
            />
          </div>
          <Icon
            icon="ion:play-skip-back"
            width="22px"
            height="22px"
            color="rgba(220, 220, 220, 0.7)"
            class="van-haptics-feedback"
            @click="songStore.prevSong"
          />
          <PlayPauseButton
            size="36"
            color="rgba(220, 220, 220, 0.7)"
            :is-playing="songStore.isPlaying"
            :play="songStore.onPlay"
            :pause="songStore.onPause"
          ></PlayPauseButton>
          <Icon
            icon="ion:play-skip-forward"
            width="22px"
            height="22px"
            color="rgba(220, 220, 220, 0.7)"
            class="van-haptics-feedback"
            @click="songStore.nextSong"
          />
          <Icon
            icon="iconamoon:playlist-thin"
            width="20"
            height="20"
            color="rgba(220, 220, 220, 0.7)"
            class="van-haptics-feedback"
            @click="showPlayingSongList = !showPlayingSongList"
          />
        </div>
      </div>
    </div>
    <PlayingSongList v-model:show="showPlayingSongList" />
    <MoreOptionsSheet
      v-model="showMoreOptions"
      :actions="[
        {
          name: '添加到收藏夹',
          color: '#1989fa',
          callback: () => {
            showMoreOptions = false;
            showAddToShelfSheet = true;
          },
        },
      ]"
    />
    <van-action-sheet
      v-model:show="showAddToShelfSheet"
      :actions="actions"
      title="选择收藏夹"
      cancel-text="取消"
      teleport="body"
    />
  </div>
</template>

<style scoped lang="less">
/* 确保模糊效果在支持的浏览器中工作 */
.backdrop-filter {
  @supports not (backdrop-filter: blur(10px)) {
    background-color: rgba(0, 0, 0, 0.7);
    filter: blur(10px);
  }
}
.lyric-line {
  &.active-line {
    color: #2fff5c !important;
    transform: scale(1.3);
    font-weight: bold;
  }
}
</style>
